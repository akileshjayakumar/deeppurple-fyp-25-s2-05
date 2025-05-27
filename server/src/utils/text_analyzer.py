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

        # Improved system prompt for analysis
        prompt = ChatPromptTemplate.from_messages([
            SystemMessagePromptTemplate.from_template(
                """
You are DeepPurple, an expert AI system specialising in nuanced text analysis, including sentiment analysis, emotion detection, topic modelling, syntax analysis, and text summarisation.

Your task is to analyse any provided text in a comprehensive, insightful, and human-readable manner. Structure your analysis into clearly labelled sections using paragraphs and full sentences—not bullet points or JSON. For each section, write in a professional, objective, and forward-thinking tone. Your analysis must cover:

1. SENTIMENT ANALYSIS:
   - Assess the overall sentiment (positive, negative, or neutral), referencing any sentiment shifts and supporting with evidence from the text. Be precise and explicit.
2. EMOTION DETECTION:
   - Identify the main emotions present (joy, sadness, anger, fear, surprise, disgust), indicate their intensity, and explain their contextual significance and triggers within the text.
3. TOPIC MODELLING:
   - Extract and explain 3-5 meaningful, non-overlapping key topics that represent the main themes, each with a concise label and supporting evidence.
4. SYNTAX ANALYSIS:
   - Comment on sentence structure, language style, and any notable grammatical or linguistic patterns that influence meaning, tone, or clarity.
5. TEXT SUMMARISATION:
   - Write a concise, stand-alone summary (1-2 paragraphs) capturing the essence, intent, and main details of the original text.

Your output must be detailed, well-structured, and accessible to professionals and researchers seeking actionable insights. Do not use lists or JSON. Write in natural, fluent English. If the analysis is based on a user-uploaded text, ensure your observations are grounded in that text.

Be accurate, comprehensive, and never evasive. If a category is not relevant, briefly state why.
"""
            ),
            HumanMessagePromptTemplate.from_template(
                """Please analyse the following text as described:

```
{text}
```
"""
            )
        ])

        # Create chain and execute
        chain = prompt | llm | StrOutputParser()
        response = chain.invoke({"text": text[:10000]})  # Limit text length

        logger.debug(f"Raw response from OpenAI: {response[:500]}...")

        # Return the natural language analysis as a string (not JSON)
        return {"analysis": response.strip()}

    except Exception as e:
        logger.error(f"Error during text analysis: {str(e)}")
        logger.debug(traceback.format_exc())
        return {
            "analysis": "Unable to analyse the provided text due to an internal error."
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
    try:
        logger.debug(f"Starting to answer question: '{question[:50]}...'")
        conversation_messages = []
        if conversation_history and len(conversation_history) > 0:
            for i, qa_pair in enumerate(conversation_history):
                conversation_messages.append(f"User: {qa_pair['question']}")
                conversation_messages.append(f"Assistant: {qa_pair['answer']}")

        system_message = SystemMessagePromptTemplate.from_template(
            """
You are DeepPurple, an expert AI system specialising in nuanced text analysis, including sentiment analysis, emotion detection, topic modelling, syntax analysis, and text summarisation.

Your task is to answer user questions by providing clear, structured, and in-depth analysis of any provided text. If a user provides text for analysis, apply your analytical skills as described below and base your answer strictly on the content. If the user simply asks a general question, answer naturally, drawing from your expertise, but do not mention missing context.

Your analysis or answers should cover, as appropriate:
- Sentiment analysis: clear, evidence-based assessment.
- Emotion detection: main emotions and their triggers.
- Topic modelling: key themes and supporting details.
- Syntax analysis: any notable linguistic or grammatical features.
- Text summarisation: concise, stand-alone summary.

Present your response in labelled sections, using full sentences and paragraphs. Write in a professional, objective, and forward-thinking tone suitable for researchers and analysts.

Be comprehensive, accurate, and never evasive. Do not use lists, bullet points, or JSON.

If you reference the context, specify the sections you relied on at the end under "Sources:"; otherwise, state "General knowledge".
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

Provide a detailed, insightful answer or analysis as described above. If I've provided text to analyse, ground your answer in that text.
"""
        )

        chat_prompt = ChatPromptTemplate.from_messages([system_message, human_message])

        inputs = {
            "question": question,
            "context": context[:10000],
            "conversation_history": "\n".join(conversation_messages)
        }

        llm = get_openai_llm(temperature=0.2)
        chain = chat_prompt | llm | StrOutputParser()
        response = chain.invoke(inputs)

        # Split out Sources section if present
        answer = ""
        sources = []
        parts = response.split("Sources:", 1)
        if len(parts) > 1:
            answer = parts[0].strip()
            sources_text = parts[1].strip()
            sources = [s.strip() for s in sources_text.split("\n") if s.strip()]
        else:
            answer = response
            sources = []

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

        conversation_messages = []
        if conversation_history and len(conversation_history) > 0:
            for i, qa_pair in enumerate(conversation_history):
                conversation_messages.append(f"User: {qa_pair['question']}")
                conversation_messages.append(f"Assistant: {qa_pair['answer']}")

        system_message = SystemMessagePromptTemplate.from_template(
            """
You are DeepPurple, an expert AI system specialising in nuanced text analysis, including sentiment analysis, emotion detection, topic modelling, syntax analysis, and text summarisation.

Your task is to answer user questions by providing clear, structured, and in-depth analysis of any provided text. If a user provides text for analysis, apply your analytical skills as described below and base your answer strictly on the content. If the user simply asks a general question, answer naturally, drawing from your expertise, but do not mention missing context.

Your analysis or answers should cover, as appropriate:
- Sentiment analysis: clear, evidence-based assessment.
- Emotion detection: main emotions and their triggers.
- Topic modelling: key themes and supporting details.
- Syntax analysis: any notable linguistic or grammatical features.
- Text summarisation: concise, stand-alone summary.

Present your response in labelled sections, using full sentences and paragraphs. Write in a professional, objective, and forward-thinking tone suitable for researchers and analysts.

Be comprehensive, accurate, and never evasive. Do not use lists, bullet points, or JSON.
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

Provide a detailed, insightful answer or analysis as described above. If I've provided text to analyse, ground your answer in that text.
"""
        )

        chat_prompt = ChatPromptTemplate.from_messages([system_message, human_message])

        inputs = {
            "question": question,
            "context": context[:10000],
            "conversation_history": "\n".join(conversation_messages)
        }

        llm = get_openai_llm(temperature=0.2, streaming=True)
        chain = chat_prompt | llm

        async for chunk in chain.astream(inputs):
            if hasattr(chunk, 'content'):
                yield chunk.content
            elif isinstance(chunk, str):
                yield chunk
            else:
                try:
                    content = chunk.get('content', '')
                    if content:
                        yield content
                except:
                    pass

    except Exception as e:
        logger.error(f"Error streaming answer: {str(e)}")
        logger.debug(traceback.format_exc())
        yield "I couldn't process your question due to a technical error. Please try again later."
