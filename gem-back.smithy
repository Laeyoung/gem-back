$version: "2"
namespace com.laeyoung.gemback

/// The GemBack service that provides resilient access to Gemini models
service GemBackService {
    version: "2024-12-27"
    operations: [GenerateContent]
}

/// Configuration for the GemBack client
structure GemBackConfig {
    /// List of API keys for rotation
    @required
    apiKeys: StringList

    /// Ordered list of models to fallback to
    fallbackOrder: ModelList

    /// Maximum number of retries per key/model combination
    maxRetries: Integer

    /// Request timeout in milliseconds
    timeout: Integer

    /// Delay between retries in milliseconds
    retryDelay: Integer
}

list StringList {
    member: String
}

list ModelList {
    member: String
}

/// Operation to generate content from a prompt
operation GenerateContent {
    input: GenerateContentInput
    output: GenerateContentOutput
    errors: [GemBackError]
}

structure GenerateContentInput {
    /// The text prompt to send to the model
    @required
    prompt: String

    /// Optional specific model to use (overrides default/first in fallback)
    model: String

    temperature: Float
    maxTokens: Integer
    topP: Float
    topK: Integer
}

structure GenerateContentOutput {
    /// The generated text response
    @required
    text: String

    /// The actual model that successfully generated the response
    @required
    modelUsed: String

    finishReason: String
    usage: Usage
}

structure Usage {
    promptTokens: Integer
    completionTokens: Integer
    totalTokens: Integer
}

/// General error for GemBack operations
@error("client")
structure GemBackError {
    @required
    message: String
    code: String
}
