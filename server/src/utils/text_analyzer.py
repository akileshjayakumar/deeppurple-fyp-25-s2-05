import os
from typing import Dict, List, Any, Tuple, AsyncGenerator
import json
import logging
import traceback
import asyncio
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate

from core.config import settings

# Set up logging
logger = logging.getLogger(__name__)


def get_openai_llm(temperature: float = 0.0, streaming: bool = False):
    """
    Create an OpenAI LLM with the specified temperature.

    Args:
        temperature: The temperature parameter for the LLM
        streaming: Whether to enable streaming

    Returns:
        An OpenAI LLM instance
    """
    return ChatOpenAI(
        api_key=settings.OPENAI_API_KEY,
        temperature=temperature,
        model="gpt-4o",
        streaming=streaming
    )


def analyze_text(text: str) -> Dict[str, Any]:
    """
    Perform comprehensive analysis on text, extracting sentiment, emotions, topics, and a summary.

    Args:
        text: The text content to analyze

    Returns:
        Dict with analysis results containing sentiment, emotions, topics, and summary
    """
    try:
        logger.info("Starting text analysis with OpenAI")

        # Create the LLM
        llm = get_openai_llm(temperature=0.2)

        # Create the prompt template for analysis
        prompt = ChatPromptTemplate.from_messages([
            SystemMessagePromptTemplate.from_template(
                """You are DeepPurple, an expert text analysis system specializing in sentiment analysis, emotion detection, text summarization, topic modeling, and syntax analysis.

Your task is to analyze the provided text with precision and nuance, following these guidelines:

1. SENTIMENT ANALYSIS:
   - Evaluate the overall sentiment (positive, negative, neutral)
   - Assign numerical scores (0.0-1.0) for each sentiment category
   - Consider contextual cues, sarcasm, and implicit attitudes
   - Identify sentiment shifts throughout the text

2. EMOTION DETECTION:
   - Identify the presence and intensity of six core emotions: joy, sadness, anger, fear, surprise, and disgust
   - Assign numerical scores (0.0-1.0) for each emotion
   - Determine the dominant emotion based on contextual significance, not just frequency
   - Consider emotional triggers and responses in the text

3. TOPIC MODELING:
   - Extract 3-5 distinct topics that represent the main themes
   - Ensure topics are specific, meaningful, and non-overlapping
   - Each topic should be labeled with a concise phrase (2-4 words)
   - Topics should capture the essential subject matter, not just frequent terms

4. TEXT SUMMARIZATION:
   - Create a concise summary (1-3 paragraphs) that captures the key points
   - Preserve the original meaning, intent, and tone
   - Include critical details while eliminating redundancy
   - Ensure the summary is coherent and stands alone

5. SYNTAX ANALYSIS (implicit in your processing):
   - Consider sentence structure, grammatical patterns, and linguistic features
   - Use this understanding to refine your other analyses

Be objective, accurate, and comprehensive in your analysis. Your output will be used for communication analysis, research, and decision-making.
"""
            ),
            HumanMessagePromptTemplate.from_template(
                """Analyze the following text enclosed between triple backticks:

```
{text}
```
                
Format your response as a JSON object with the following structure:
{
    "sentiment": {
        "positive": float,  // Score between 0.0-1.0
        "negative": float,  // Score between 0.0-1.0
        "neutral": float,   // Score between 0.0-1.0
        "overall": string   // "positive", "negative", or "neutral"
    },
    "emotions": {
        "joy": float,       // Score between 0.0-1.0
        "sadness": float,   // Score between 0.0-1.0
        "anger": float,     // Score between 0.0-1.0
        "fear": float,      // Score between 0.0-1.0
        "surprise": float,  // Score between 0.0-1.0
        "disgust": float,   // Score between 0.0-1.0
        "dominant_emotion": string  // The emotion with highest contextual significance
    },
    "topics": [
        {
            "name": string,  // Concise topic label (2-4 words)
            "keywords": [string, string, string]  // 3 representative keywords
        },
        // Additional topics...
    ],
    "summary": string  // Concise summary of the text
}

Ensure your response is valid JSON and follows this exact structure."""
            )
        ])

        # Create chain and execute
        chain = prompt | llm | StrOutputParser()
        response = chain.invoke({"text": text[:10000]})  # Limit text length

        # Parse the JSON response
        results = json.loads(response)
        logger.debug("Successfully parsed analysis response")
        return results

    except Exception as e:
        logger.error(f"Error during text analysis: {str(e)}")
        logger.debug(traceback.format_exc())
        raise


def answer_question(question: str, context: str, conversation_history: List[Dict[str, str]] = None) -> Tuple[str, List[str]]:
    """
    Answer a question based on the provided context and previous conversation history.

    Args:
        question: The user's question
        context: The text content to use as reference
        conversation_history: Optional list of previous Q&A pairs

    Returns:
        Tuple containing the answer and sources
    """
    try:
        logger.debug(f"Starting to answer question: '{question[:50]}...'")

        # Build conversation history context if provided
        conversation_messages = []
        if conversation_history and len(conversation_history) > 0:
            for i, qa_pair in enumerate(conversation_history):
                conversation_messages.append(f"User: {qa_pair['question']}")
                conversation_messages.append(f"Assistant: {qa_pair['answer']}")

        # Create the chat template
        system_message = SystemMessagePromptTemplate.from_template(
            """You are DeepPurple, an AI assistant specializing in text analysis with expertise in sentiment analysis, emotion detection, text summarization, topic modeling, and syntax analysis.

Your primary goal is to help users analyze text and provide insights. When users upload files or provide text, you analyze the content and answer questions about it.

When responding to users:
1. Be conversational, helpful, and engaging
2. If a user asks what you can do, explain your text analysis capabilities (sentiment analysis, emotion detection, etc.)
3. If a user asks a general question without providing text to analyze:
   - Answer naturally using your knowledge
   - Don't mention "missing context" or suggest uploading files unless specifically asked
   - Maintain a helpful tone focused on text analysis as your specialty

Your text analysis capabilities:
- Sentiment Analysis: Detecting positive, negative, or neutral sentiment in text
- Emotion Detection: Identifying emotions like joy, sadness, anger, fear, surprise, and disgust
- Text Summarization: Creating concise summaries of longer content
- Topic Modeling: Extracting key themes and topics from text
- Interactive Q&A: Answering questions about analyzed text

When text is provided for analysis:
1. COMPREHENSION: Carefully analyze both the question and context
2. REASONING: Use step-by-step reasoning for accurate answers
3. VERIFICATION: Ensure your answer is directly supported by the context
4. CITATION: Reference specific parts of the context when relevant
5. CLARITY: Present information in a structured, easy-to-understand format

Always maintain a helpful, informative tone while prioritizing accuracy.
"""
        )

        human_message = HumanMessagePromptTemplate.from_template(
            """Previous conversation:
{conversation_history}

Context:
```
{context}
```

Question: {question}

Answer my question helpfully. If I've provided text to analyze, base your response on that text. If not, just answer naturally without mentioning the need for context.

Format your response as follows:
1. First provide your comprehensive answer
2. Then on a new line after "Sources:", list the specific sections from the context that support your answer, or indicate "General knowledge" if using information outside the context. Only include this Sources section if I've provided text to analyze.
"""
        )

        chat_prompt = ChatPromptTemplate.from_messages(
            [system_message, human_message])

        # Prepare inputs
        inputs = {
            "question": question,
            "context": context[:10000],  # Limit the context length
            "conversation_history": "\n".join(conversation_messages)
        }

        # Create the LLM
        llm = get_openai_llm(temperature=0.2)

        # Execute the chain
        chain = chat_prompt | llm | StrOutputParser()
        response = chain.invoke(inputs)

        # Parse the response to extract answer and sources
        answer = ""
        sources = []

        # Simple parsing of the response format
        parts = response.split("Sources:", 1)
        if len(parts) > 1:
            answer = parts[0].strip()
            sources_text = parts[1].strip()
            # Convert sources text to list
            sources = [s.strip()
                       for s in sources_text.split("\n") if s.strip()]
        else:
            answer = response
            sources = []

        # If parsing failed, use the whole response as the answer
        if not answer:
            answer = response

        return answer, sources

    except Exception as e:
        logger.error(f"Error answering question: {str(e)}")
        logger.debug(traceback.format_exc())
        raise


async def answer_question_stream(question: str, context: str, conversation_history: List[Dict[str, str]] = None) -> AsyncGenerator[str, None]:
    """
    Stream answer to a question based on provided context and conversation history.

    Args:
        question: The user's question
        context: The text content to use as reference
        conversation_history: Optional list of previous Q&A pairs

    Yields:
        Token by token response
    """
    try:
        logger.debug(f"Starting to stream answer for: '{question[:50]}...'")

        # Build conversation history messages
        conversation_messages = []
        if conversation_history and len(conversation_history) > 0:
            for i, qa_pair in enumerate(conversation_history):
                conversation_messages.append(f"User: {qa_pair['question']}")
                conversation_messages.append(f"Assistant: {qa_pair['answer']}")

        # Create the chat template
        system_message = SystemMessagePromptTemplate.from_template(
            """You are DeepPurple, an AI assistant specializing in text analysis with expertise in sentiment analysis, emotion detection, text summarization, topic modeling, and syntax analysis.

Your primary goal is to help users analyze text and provide insights. When users upload files or provide text, you analyze the content and answer questions about it.

When responding to users:
1. Be conversational, helpful, and engaging
2. If a user asks what you can do, explain your text analysis capabilities (sentiment analysis, emotion detection, etc.)
3. If a user asks a general question without providing text to analyze:
   - Answer naturally using your knowledge
   - Don't mention "missing context" or suggest uploading files unless specifically asked
   - Maintain a helpful tone focused on text analysis as your specialty

Your text analysis capabilities:
- Sentiment Analysis: Detecting positive, negative, or neutral sentiment in text
- Emotion Detection: Identifying emotions like joy, sadness, anger, fear, surprise, and disgust
- Text Summarization: Creating concise summaries of longer content
- Topic Modeling: Extracting key themes and topics from text
- Interactive Q&A: Answering questions about analyzed text

When text is provided for analysis:
1. COMPREHENSION: Carefully analyze both the question and context
2. REASONING: Use step-by-step reasoning for accurate answers
3. VERIFICATION: Ensure your answer is directly supported by the context
4. CITATION: Reference specific parts of the context when relevant
5. CLARITY: Present information in a structured, easy-to-understand format

Always maintain a helpful, informative tone while prioritizing accuracy.
"""
        )

        human_message = HumanMessagePromptTemplate.from_template(
            """Previous conversation:
{conversation_history}

Context:
```
{context}
```

Question: {question}

Answer my question helpfully. If I've provided text to analyze, base your response on that text. If not, just answer naturally without mentioning the need for context.
"""
        )

        chat_prompt = ChatPromptTemplate.from_messages(
            [system_message, human_message])

        # Prepare inputs
        inputs = {
            "question": question,
            "context": context[:10000],  # Limit the context length
            "conversation_history": "\n".join(conversation_messages)
        }

        # Create the LLM with streaming enabled
        llm = get_openai_llm(temperature=0.2, streaming=True)

        # Set up the streaming chain
        chain = chat_prompt | llm

        # Use async iterator for streaming responses
        async for chunk in chain.astream(inputs):
            if hasattr(chunk, 'content'):
                yield chunk.content
            elif isinstance(chunk, str):
                yield chunk
            else:
                # If the chunk is in a different format, try to extract content
                try:
                    content = chunk.get('content', '')
                    if content:
                        yield content
                except:
                    # If we can't extract content, skip this chunk
                    pass

    except Exception as e:
        logger.error(f"Error streaming answer: {str(e)}")
        logger.debug(traceback.format_exc())
        # Yield error message
        yield "I couldn't process your question due to a technical error. Please try again later."
