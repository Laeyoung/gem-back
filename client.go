package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
)

// --- Interfaces for Testability ---

// GenAIModel defines the interface for the generative model
type GenAIModel interface {
	GenerateContent(ctx context.Context, parts ...genai.Part) (*genai.GenerateContentResponse, error)
	SetTemperature(float32)
	SetMaxOutputTokens(int32)
	SetTopP(float32)
	SetTopK(int32)
}

// GenAIClient defines the interface for creating models
type GenAIClient interface {
	GenerativeModel(name string) GenAIModel
	Close() error
}

// ClientFactory defines a function type to create a GenAIClient
type ClientFactory func(ctx context.Context, apiKey string) (GenAIClient, error)

// --- Real Implementations ---

type realGenAIClient struct {
	client *genai.Client
}

func (c *realGenAIClient) GenerativeModel(name string) GenAIModel {
	return c.client.GenerativeModel(name)
}

func (c *realGenAIClient) Close() error {
	return c.client.Close()
}

func defaultClientFactory(ctx context.Context, apiKey string) (GenAIClient, error) {
	c, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, err
	}
	return &realGenAIClient{client: c}, nil
}

// --- Main Logic ---

// GemBackConfig holds the configuration for the client
type GemBackConfig struct {
	ApiKeys       []string
	FallbackOrder []string
	MaxRetries    int
	Timeout       time.Duration
	RetryDelay    time.Duration
}

// GenerateContentInput represents the input for content generation
type GenerateContentInput struct {
	Prompt      string
	Model       string // Optional override
	Temperature float32
	MaxTokens   int32
	TopP        float32
	TopK        int32
}

// GenerateContentOutput represents the output of content generation
type GenerateContentOutput struct {
	Text         string
	ModelUsed    string
	FinishReason string
	Usage        *Usage
}

// Usage represents token usage statistics
type Usage struct {
	PromptTokens     int32
	CompletionTokens int32
	TotalTokens      int32
}

// GemBackClient is the main client struct
type GemBackClient struct {
	config          GemBackConfig
	currentKeyIndex int
	clientFactory   ClientFactory // Added for dependency injection
}

// NewGemBackClient creates a new client instance
func NewGemBackClient(config GemBackConfig) (*GemBackClient, error) {
	if len(config.ApiKeys) == 0 {
		return nil, errors.New("at least one API key is required")
	}
	if config.FallbackOrder == nil {
		config.FallbackOrder = []string{"gemini-1.5-flash", "gemini-1.5-pro"}
	}
	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}
	if config.RetryDelay == 0 {
		config.RetryDelay = 1 * time.Second
	}
	return &GemBackClient{
		config:        config,
		clientFactory: defaultClientFactory, // Default to real implementation
	}, nil
}

// GenerateContent generates content with automatic key rotation and model fallback
func (c *GemBackClient) GenerateContent(ctx context.Context, input GenerateContentInput) (*GenerateContentOutput, error) {
	modelsToTry := c.config.FallbackOrder
	if input.Model != "" {
		modelsToTry = []string{input.Model}
	}

	var lastErr error

	for _, modelName := range modelsToTry {
		// Rotate keys for each attempt
		startKeyIndex := c.currentKeyIndex
		keysCount := len(c.config.ApiKeys)

		for i := 0; i < keysCount; i++ {
			// Calculate current key index with rotation
			currentIndex := (startKeyIndex + i) % keysCount
			apiKey := c.config.ApiKeys[currentIndex]

			// Update global index for next request
			c.currentKeyIndex = (currentIndex + 1) % keysCount

			// Create client using the factory
			client, err := c.clientFactory(ctx, apiKey)
			if err != nil {
				lastErr = fmt.Errorf("failed to create client: %w", err)
				continue
			}
			// Close is deferred but inside a loop, which is tricky.
			// Ideally, we explicitly close it at the end of the iteration.
			// defer client.Close() would accumulate closures until function exit.
			
			model := client.GenerativeModel(modelName)
			
			// Configure model
			if input.Temperature != 0 {
				model.SetTemperature(input.Temperature)
			}
			if input.MaxTokens != 0 {
				model.SetMaxOutputTokens(input.MaxTokens)
			}
			if input.TopP != 0 {
				model.SetTopP(input.TopP)
			}
			if input.TopK != 0 {
				model.SetTopK(input.TopK)
			}

			// Add timeout to context
			reqCtx, cancel := context.WithTimeout(ctx, c.config.Timeout)

			resp, err := model.GenerateContent(reqCtx, genai.Text(input.Prompt))
			cancel() // Cancel context immediately after call finishes
			client.Close() // Explicitly close client here

			if err != nil {
				// Check for 429 or other errors
				var apiErr *googleapi.Error
				if errors.As(err, &apiErr) {
					if apiErr.Code == 429 {
						log.Printf("Rate limit hit for key ending ...%s. Rotating.", apiKey[len(apiKey)-4:])
						lastErr = err
						continue // Try next key
					}
					if apiErr.Code >= 500 {
						log.Printf("Server error for key ending ...%s. Retrying.", apiKey[len(apiKey)-4:])
						time.Sleep(c.config.RetryDelay)
						lastErr = err
						continue // Try next key
					}
				}
				
				log.Printf("Error with model %s: %v", modelName, err)
				lastErr = err
				continue // Try next key
			}

			// Process Response
			if len(resp.Candidates) == 0 {
				lastErr = errors.New("no candidates returned")
				continue
			}

			candidate := resp.Candidates[0]
			var text string
			if len(candidate.Content.Parts) > 0 {
				if t, ok := candidate.Content.Parts[0].(genai.Text); ok {
					text = string(t)
				}
			}

			usage := &Usage{}
			if resp.UsageMetadata != nil {
				usage.PromptTokens = resp.UsageMetadata.PromptTokenCount
				usage.CompletionTokens = resp.UsageMetadata.CandidatesTokenCount
				usage.TotalTokens = resp.UsageMetadata.TotalTokenCount
			}

			return &GenerateContentOutput{
				Text:         text,
				ModelUsed:    modelName,
				FinishReason: string(candidate.FinishReason),
				Usage:        usage,
			}, nil
		}
		log.Printf("All keys failed for model %s. Falling back...", modelName)
	}

	return nil, fmt.Errorf("all models and keys failed. Last error: %w", lastErr)
}