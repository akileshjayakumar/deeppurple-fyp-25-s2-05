import os
from typing import Dict, List, Any, Tuple, AsyncGenerator, Optional
import json
import logging
import traceback
import asyncio
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
from fastapi import HTTPException

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
    try:
        # Log the API key presence (not the actual key)
        logger.debug(
            f"OpenAI API Key present: {bool(settings.OPENAI_API_KEY)}")

        # Use ChatOpenAI
        return ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            temperature=temperature,
            model="gpt-4o",
            streaming=streaming
        )
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI LLM: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize OpenAI LLM: {str(e)}"
        )


def analyze_text(text: str) -> Dict[str, Any]:
    """
    Perform comprehensive analysis on text, extracting sentiment, emotions, topics, and a summary.

    Args:
        text: The text content to analyze

    Returns:
        Dict with analysis results containing sentiment, emotions, topics, and summary
    """
    # Check if OpenAI API key is missing or invalid
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "" or settings.OPENAI_API_KEY.startswith("sk-dummy"):
        logger.warning("Using mock analysis for text (no valid API key)")
        return generate_mock_analysis(text)

    try:
        logger.info("Starting text analysis with OpenAI")

        # Create the LLM
        llm = get_openai_llm(temperature=0.3)

        # Create the prompt template for analysis
        prompt = ChatPromptTemplate.from_messages([
            SystemMessagePromptTemplate.from_template(
                "You are an expert text analyst. Analyze the following text and provide insights."
            ),
            HumanMessagePromptTemplate.from_template(
                """Analyze the following text and provide:
                1. Sentiment analysis (positive, negative, neutral scores, and overall sentiment)
                2. Emotion detection (joy, sadness, anger, fear, surprise, disgust scores, and dominant emotion)
                3. Key topics (up to 5)
                4. A brief summary

                Text to analyze: {text}
                
                Format your response as a JSON object with the following structure:
                {{
                    "sentiment": {{"positive": float, "negative": float, "neutral": float, "overall": string}},
                    "emotions": {{"joy": float, "sadness": float, "anger": float, "fear": float, "surprise": float, "disgust": float, "dominant_emotion": string}},
                    "topics": [string, string, ...],
                    "summary": string
                }}"""
            )
        ])

        # Create chain and execute
        chain = prompt | llm | StrOutputParser()
        response = chain.invoke({"text": text[:10000]})  # Limit text length

        # Parse the JSON response
        try:
            results = json.loads(response)
            logger.debug("Successfully parsed analysis response")
            return results
        except json.JSONDecodeError:
            logger.error("Failed to parse OpenAI response as JSON")
            return generate_mock_analysis(text)

    except Exception as e:
        logger.error(f"Error during text analysis: {str(e)}")
        logger.debug(traceback.format_exc())
        return generate_mock_analysis(text)


def generate_mock_analysis(text: str) -> Dict[str, Any]:
    """
    Generate basic mock analysis results when OpenAI is unavailable.

    Args:
        text: The text to analyze

    Returns:
        Dict with mock analysis results
    """
    logger.info("Generating mock analysis")

    # Simple sentiment detection
    text_lower = text.lower()
    positive_words = ["good", "great", "excellent",
                      "amazing", "happy", "love", "best"]
    negative_words = ["bad", "terrible", "awful",
                      "horrible", "sad", "hate", "worst"]

    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    total = positive_count + negative_count

    if total == 0:
        sentiment = {"positive": 0.1, "negative": 0.1,
                     "neutral": 0.8, "overall": "neutral"}
    else:
        pos_score = min(positive_count / (total * 1.5), 1.0)
        neg_score = min(negative_count / (total * 1.5), 1.0)
        neu_score = max(0, 1.0 - (pos_score + neg_score))

        if pos_score > neg_score and pos_score > neu_score:
            overall = "positive"
        elif neg_score > pos_score and neg_score > neu_score:
            overall = "negative"
        else:
            overall = "neutral"

        sentiment = {"positive": pos_score, "negative": neg_score,
                     "neutral": neu_score, "overall": overall}

    # Simple summary
    if len(text) > 300:
        summary = text[:297] + "..."
    else:
        summary = text

    return {
        "sentiment": sentiment,
        "emotions": {
            "joy": 0.2,
            "sadness": 0.2,
            "anger": 0.1,
            "fear": 0.1,
            "surprise": 0.2,
            "disgust": 0.1,
            "dominant_emotion": "neutral"
        },
        "topics": ["topic1", "topic2", "topic3"],
        "summary": summary
    }


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
    # Check if OpenAI API key is missing or invalid
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "" or settings.OPENAI_API_KEY.startswith("sk-dummy"):
        logger.warning("Using mock question answering (no valid API key)")
        return (f"Based on the information provided, I would answer your question about '{question}' as follows: This appears to be text discussing analysis and communication concepts.", ["Context analysis"])

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
            "You are a helpful assistant that answers questions based on provided context. "
            "If the context is empty, use your general knowledge to provide a helpful answer. "
            "If the answer cannot be found in the provided context, state that clearly and offer what you know about the topic."
        )

        human_message = HumanMessagePromptTemplate.from_template(
            "Previous conversation:\n{conversation_history}\n\n"
            "Context: {context}\n\n"
            "Question: {question}\n\n"
            "Provide your answer in the following format:\n"
            "Answer: [Your comprehensive answer here]\n"
            "Sources: [List of relevant segments from the context that support your answer, or 'General knowledge' if using general knowledge]"
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
        for line in response.split('\n'):
            if line.startswith("Answer:"):
                answer = line[7:].strip()
            elif line.startswith("Sources:"):
                sources_text = line[8:].strip()
                # Convert sources text to list
                if sources_text.startswith('[') and sources_text.endswith(']'):
                    try:
                        sources = json.loads(sources_text)
                    except:
                        sources = [s.strip()
                                   for s in sources_text[1:-1].split(',')]
                else:
                    sources = [sources_text]

        # If parsing failed, use the whole response as the answer
        if not answer:
            answer = response

        return answer, sources

    except Exception as e:
        logger.error(f"Error answering question: {str(e)}")
        logger.debug(traceback.format_exc())
        return "I couldn't process your question due to a technical error. Please try again later.", []


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
    # Check if OpenAI API key is missing
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "" or settings.OPENAI_API_KEY.startswith("sk-dummy"):
        logger.warning("Using mock streaming answer (no valid API key)")
        mock_answer = "I'm analyzing your question... "
        for char in mock_answer:
            yield char
            await asyncio.sleep(0.01)

        stream_text = f"Based on the information provided, I would answer your question about '{question}' as follows: This appears to be text discussing analysis and communication concepts."

        for char in stream_text:
            yield char
            await asyncio.sleep(0.01)
        return

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
            "You are a helpful assistant that answers questions based on provided context. "
            "If the context is empty, use your general knowledge to provide a helpful answer. "
            "If the answer cannot be found in the provided context, state that clearly and offer what you know about the topic."
        )

        human_message = HumanMessagePromptTemplate.from_template(
            "Previous conversation:\n{conversation_history}\n\n"
            "Context: {context}\n\n"
            "Question: {question}"
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
