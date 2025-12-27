package main

import (
	"context"
	"errors"
	"testing"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/googleapi"
)

// --- Mock Implementations ---

type mockGenAIClient struct {
	model *mockGenAIModel
}

func (c *mockGenAIClient) GenerativeModel(name string) GenAIModel {
	c.model.name = name
	return c.model
}

func (c *mockGenAIClient) Close() error {
	return nil
}

type mockGenAIModel struct {
	name             string
	responses        []*genai.GenerateContentResponse
	errors           []error
	callCount        int
	capturedContext  context.Context
}

func (m *mockGenAIModel) GenerateContent(ctx context.Context, parts ...genai.Part) (*genai.GenerateContentResponse, error) {
	m.capturedContext = ctx
	idx := m.callCount
	m.callCount++

	if idx < len(m.errors) && m.errors[idx] != nil {
		return nil, m.errors[idx]
	}
	if idx < len(m.responses) {
		return m.responses[idx], nil
	}
	return nil, errors.New("mock: no more responses configured")
}

func (m *mockGenAIModel) SetTemperature(float32)      {}
func (m *mockGenAIModel) SetMaxOutputTokens(int32)    {}
func (m *mockGenAIModel) SetTopP(float32)             {}
func (m *mockGenAIModel) SetTopK(int32)               {}

// --- Tests ---

func TestGenerateContent_Success(t *testing.T) {
	config := GemBackConfig{
		ApiKeys:    []string{"key1"},
		RetryDelay: 0,
	}
	client, _ := NewGemBackClient(config)

	// Setup Mock
	mockModel := &mockGenAIModel{
		responses: []*genai.GenerateContentResponse{
			{
				Candidates: []*genai.Candidate{
					{
						Content: &genai.Content{
							Parts: []genai.Part{genai.Text("Success")},
						},
						FinishReason: genai.FinishReasonStop,
					},
				},
			},
		},
		errors: []error{nil},
	}

	// Inject Factory
	client.clientFactory = func(ctx context.Context, apiKey string) (GenAIClient, error) {
		if apiKey != "key1" {
			t.Errorf("Expected key1, got %s", apiKey)
		}
		return &mockGenAIClient{model: mockModel}, nil
	}

	output, err := client.GenerateContent(context.Background(), GenerateContentInput{Prompt: "hi"})
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if output.Text != "Success" {
		t.Errorf("Expected 'Success', got '%s'", output.Text)
	}
}

func TestGenerateContent_KeyRotation(t *testing.T) {
	config := GemBackConfig{
		ApiKeys:       []string{"key1", "key2"},
		FallbackOrder: []string{"model-a"},
		RetryDelay:    0,
	}
	client, _ := NewGemBackClient(config)

	// We need to track calls across different client instances (since each key creates a new client)
	// Use a shared map or just verify behavior via errors/responses
	
	// Mock behavior:
	// Call 1 (Key1): 429 Error
	// Call 2 (Key2): Success

	callCounter := 0
	client.clientFactory = func(ctx context.Context, apiKey string) (GenAIClient, error) {
		callCounter++
		mockModel := &mockGenAIModel{}
		
		if callCounter == 1 {
			// First call with key1
			if apiKey != "key1" {
				t.Errorf("Expected first call to use key1, got %s", apiKey)
			}
			mockModel.errors = []error{&googleapi.Error{Code: 429, Message: "Quota exceeded"}}
		} else if callCounter == 2 {
			// Second call with key2
			if apiKey != "key2" {
				t.Errorf("Expected second call to use key2, got %s", apiKey)
			}
			mockModel.responses = []*genai.GenerateContentResponse{
				{
					Candidates: []*genai.Candidate{
						{
							Content: &genai.Content{
								Parts: []genai.Part{genai.Text("Success after rotation")},
							},
						},
					},
				},
			}
			mockModel.errors = []error{nil}
		}
		
		return &mockGenAIClient{model: mockModel}, nil
	}

	output, err := client.GenerateContent(context.Background(), GenerateContentInput{Prompt: "hi"})
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if output.Text != "Success after rotation" {
		t.Errorf("Expected success text, got %s", output.Text)
	}
	if callCounter != 2 {
		t.Errorf("Expected 2 calls, got %d", callCounter)
	}
}

func TestGenerateContent_ModelFallback(t *testing.T) {
	config := GemBackConfig{
		ApiKeys:       []string{"key1"},
		FallbackOrder: []string{"model-a", "model-b"},
		RetryDelay:    0,
	}
	client, _ := NewGemBackClient(config)

	callCounter := 0
	client.clientFactory = func(ctx context.Context, apiKey string) (GenAIClient, error) {
		callCounter++
		mockModel := &mockGenAIModel{}
		
		// Logic:
		// Call 1: model-a, key1 -> Error
		// Call 2: model-b, key1 -> Success
		
		// The client factory doesn't know the model name yet, the GenerativeModel call does.
		// But our mock client sets the name on the mock model.
		
		// We can return a generic mock model that checks its own name when GenerateContent is called?
		// Or easier: we can't easily distinguish model inside factory unless we inspect the mock later.
		// Let's make the mock model smart enough to fail based on name?
		// Wait, GenerateContent is called on the model returned by GenerativeModel(name).
		
		// Let's customize the mockClient to return different models based on name.
		return &smartMockClient{}, nil
	}

	output, err := client.GenerateContent(context.Background(), GenerateContentInput{Prompt: "hi"})
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if output.ModelUsed != "model-b" {
		t.Errorf("Expected model-b used, got %s", output.ModelUsed)
	}
}

// smartMockClient returns models that behave differently based on name
type smartMockClient struct{}

func (c *smartMockClient) GenerativeModel(name string) GenAIModel {
	m := &mockGenAIModel{name: name}
	if name == "model-a" {
		m.errors = []error{errors.New("Some error")}
	} else if name == "model-b" {
		m.responses = []*genai.GenerateContentResponse{
			{
				Candidates: []*genai.Candidate{
					{
						Content: &genai.Content{
							Parts: []genai.Part{genai.Text("Fallback Success")},
						},
					},
				},
			},
		}
		m.errors = []error{nil}
	}
	return m
}

func (c *smartMockClient) Close() error { return nil }
