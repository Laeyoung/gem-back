/**
 * Function Calling Example
 *
 * This example demonstrates how to use function calling (tool use)
 * to enable the model to invoke external functions with structured parameters.
 *
 * Function calling is useful for:
 * - Integrating with external APIs and services
 * - Performing calculations and data processing
 * - Accessing databases and retrieving information
 * - Creating structured workflows and automation
 */

import { GemBack } from 'gemback';
import type { FunctionDeclaration } from 'gemback';

// Example function implementations
function getCurrentWeather(location: string, unit: string = 'celsius'): string {
  // Simulated weather API response
  const weatherData: Record<string, { temp: number; condition: string }> = {
    tokyo: { temp: 15, condition: 'Sunny' },
    london: { temp: 8, condition: 'Cloudy' },
    'new york': { temp: 12, condition: 'Rainy' },
  };

  const data = weatherData[location.toLowerCase()] || { temp: 20, condition: 'Unknown' };
  const temp = unit === 'fahrenheit' ? (data.temp * 9) / 5 + 32 : data.temp;

  return JSON.stringify({
    location,
    temperature: temp,
    unit,
    condition: data.condition,
  });
}

function calculateMortgage(
  principal: number,
  annualRate: number,
  years: number
): string {
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  const monthlyPayment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return JSON.stringify({
    monthlyPayment: monthlyPayment.toFixed(2),
    totalPayment: (monthlyPayment * numPayments).toFixed(2),
    totalInterest: (monthlyPayment * numPayments - principal).toFixed(2),
  });
}

async function main() {
  const client = new GemBack({
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
  });

  try {
    // Example 1: Basic function calling
    console.log('=== Example 1: Weather Query with Function Calling ===\n');

    // Define the weather function
    const weatherFunction: FunctionDeclaration = {
      name: 'get_current_weather',
      description: 'Get the current weather in a given location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city name, e.g. Tokyo, London',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'The temperature unit',
          },
        },
        required: ['location'],
      },
    };

    const response1 = await client.generate("What's the weather like in Tokyo?", {
      tools: [weatherFunction],
      toolConfig: {
        functionCallingMode: 'auto', // Let the model decide when to call
      },
    });

    console.log('Model response:', response1.text);

    if (response1.functionCalls && response1.functionCalls.length > 0) {
      console.log('\nFunction calls requested by model:');
      response1.functionCalls.forEach((call, index) => {
        console.log(`\n${index + 1}. Function: ${call.name}`);
        console.log('   Arguments:', JSON.stringify(call.args, null, 2));

        // Execute the function
        if (call.name === 'get_current_weather') {
          const result = getCurrentWeather(
            call.args.location as string,
            call.args.unit as string
          );
          console.log('   Result:', result);
        }
      });
    }

    // Example 2: Multiple functions with 'any' mode
    console.log('\n\n=== Example 2: Multiple Functions (Forced Calling) ===\n');

    const mortgageFunction: FunctionDeclaration = {
      name: 'calculate_mortgage',
      description:
        'Calculate monthly mortgage payment based on principal, annual interest rate, and loan term',
      parameters: {
        type: 'object',
        properties: {
          principal: {
            type: 'number',
            description: 'Loan principal amount in dollars',
          },
          annual_rate: {
            type: 'number',
            description: 'Annual interest rate as a percentage (e.g., 4.5 for 4.5%)',
          },
          years: {
            type: 'number',
            description: 'Loan term in years',
          },
        },
        required: ['principal', 'annual_rate', 'years'],
      },
    };

    const response2 = await client.generate(
      'I want to buy a house for $300,000 with a 30-year mortgage at 4.5% interest. What would my monthly payment be?',
      {
        tools: [mortgageFunction, weatherFunction],
        toolConfig: {
          functionCallingMode: 'any', // Force the model to call at least one function
        },
      }
    );

    console.log('Model response:', response2.text);

    if (response2.functionCalls && response2.functionCalls.length > 0) {
      console.log('\nFunction calls:');
      response2.functionCalls.forEach((call) => {
        console.log(`\nFunction: ${call.name}`);
        console.log('Arguments:', JSON.stringify(call.args, null, 2));

        if (call.name === 'calculate_mortgage') {
          const result = calculateMortgage(
            call.args.principal as number,
            call.args.annual_rate as number,
            call.args.years as number
          );
          console.log('Result:', result);
        }
      });
    }

    // Example 3: Restricted function calling
    console.log('\n\n=== Example 3: Restricted Function Calling ===\n');

    const response3 = await client.generate(
      "What's the weather in London and calculate a mortgage for $200,000?",
      {
        tools: [weatherFunction, mortgageFunction],
        toolConfig: {
          functionCallingMode: 'any',
          allowedFunctionNames: ['get_current_weather'], // Only allow weather function
        },
      }
    );

    console.log('Model response:', response3.text);

    if (response3.functionCalls) {
      console.log('\nFunction calls (only weather allowed):');
      response3.functionCalls.forEach((call) => {
        console.log(`Function: ${call.name}`);
        console.log('Arguments:', JSON.stringify(call.args, null, 2));
      });
    }

    // Example 4: Function calling with streaming
    console.log('\n\n=== Example 4: Function Calling with Streaming ===\n');

    const stream = client.generateStream('Tell me the weather in New York', {
      tools: [weatherFunction],
      toolConfig: {
        functionCallingMode: 'auto',
      },
    });

    process.stdout.write('Streaming response: ');
    for await (const chunk of stream) {
      process.stdout.write(chunk.text);
    }
    console.log('\n');

    // Example 5: Multi-turn conversation with function results
    console.log('\n=== Example 5: Multi-turn with Function Results ===\n');

    // First request - model calls function
    const initialResponse = await client.generate("What's the weather in Tokyo?", {
      tools: [weatherFunction],
      toolConfig: { functionCallingMode: 'auto' },
    });

    console.log('Initial response:', initialResponse.text);

    if (initialResponse.functionCalls && initialResponse.functionCalls.length > 0) {
      const functionCall = initialResponse.functionCalls[0];
      console.log('\nFunction called:', functionCall.name);
      console.log('Arguments:', JSON.stringify(functionCall.args, null, 2));

      // Execute function and get result
      const weatherResult = getCurrentWeather(
        functionCall.args.location as string,
        functionCall.args.unit as string
      );
      console.log('Function result:', weatherResult);

      // Continue conversation with function result
      const followUpResponse = await client.generateContent(
        [
          { role: 'user', parts: [{ text: "What's the weather in Tokyo?" }] },
          {
            role: 'model',
            parts: [{ functionCall: { name: functionCall.name, args: functionCall.args } }],
          },
          {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: functionCall.name,
                  response: JSON.parse(weatherResult),
                },
              },
            ],
          },
          {
            role: 'user',
            parts: [{ text: 'Based on this weather, should I bring an umbrella?' }],
          },
        ],
        {
          tools: [weatherFunction],
        }
      );

      console.log('\nFollow-up response:', followUpResponse.text);
    }

    // Check statistics
    const stats = client.getFallbackStats();
    console.log('\n\n=== Client Statistics ===');
    console.log('Total requests:', stats.totalRequests);
    console.log('Success rate:', (stats.successRate * 100).toFixed(2) + '%');
    console.log('Model usage:', stats.modelUsage);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
