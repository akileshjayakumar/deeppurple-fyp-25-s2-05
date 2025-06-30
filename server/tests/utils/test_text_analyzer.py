import pytest
import logging
from utils.text_analyzer import visualize_text

logger = logging.getLogger(__name__)

#! This test suite calls the actual API endpoint and does not mock it.

@pytest.mark.asyncio
async def test_visualize_text_single_actor():
    """
    -- Test the visualize_text function with a single actor --
    This test checks how the function handles input with a single actor.
    The expected behavior is that it should return an overview with no actors and a positive sentiment analysis
    """

    text = "The product was amazing and I REALLY loved it. Highly recommend this laptop stand to anyone looking for a sturdy and adjustable solution."
    result = await visualize_text(text)

    # Check if the result is not None
    assert result is not None
    logger.info("Result: %s", result)

    # Check the structure of the result
    assert isinstance(result, dict)
    assert "overview" in result
    assert "actors" in result
    assert isinstance(result["overview"],dict), "Overview should be a dictionary"
    assert isinstance(result["actors"], list), "Actors should be a list"
    assert len(result["actors"]) == 0

    # Check result
    assert result["overview"]["sentiment_score"] == "positive"
    assert len(result["overview"]["emotion_distribution"]) > 0
    assert len(result["overview"]["key_topics"]) > 0
    assert result["overview"]["sentiment_intensity"] > 0
    assert len(result["overview"]["emotion_categories"]["positive_emotions"]) > 0

@pytest.mark.asyncio
async def test_visualize_text_multiple_actors():

    """
    -- Test the visualize_text function with multiple actors --
    This test checks how the function handles input with multiple actors.
    The expected behavior is that it should return an overview with multiple actors and their sentiments.
    """


    text = """
Alice: Man this product was amazing I can't believe it was so good
Bob: really? I used it before but it was really bad for me. It kept breaking down for whatever reason
Charlie: I wouldn't say it was bad but it wasn't great either. Was okay I guess
"""
    result = await visualize_text(text)

    # Check if the result is not None
    assert result is not None
    logger.info("Result: %s", result)

    # Check the structure of the result
    assert isinstance(result, dict)
    assert "overview" in result
    assert "actors" in result
    assert isinstance(result["overview"],dict), "Overview should be a dictionary"
    assert isinstance(result["actors"], list), "Actors should be a list"

    # Check result
    assert len(result["actors"]) == 3
    actor_names = [x["actor_name"] for x in result["actors"]]
    assert "Alice" in actor_names
    assert "Bob" in actor_names
    assert "Charlie" in actor_names

@pytest.mark.asyncio
async def test_visualize_text_no_input():

    """
    -- Test the visualize_text function with no input --
    This test checks how the function handles empty input.
    The expected behavior is that it should return an overview with no actors and no meaningful analysis.
    """


    text = ""
    result = await visualize_text(text)

    # Check if the result is not None
    assert result is not None
    logger.info("Result: %s", result)

    # Check the structure of the result
    assert isinstance(result, dict)
    assert "overview" in result
    assert "actors" in result
    assert isinstance(result["overview"],dict), "Overview should be a dictionary"
    assert isinstance(result["actors"], list), "Actors should be a list"
    assert len(result["actors"]) == 0

@pytest.mark.asyncio
async def test_visualize_text_irrelevant_input():

    """
    -- Test the visualize_text function with irrelevant input -- 
    This test checks how the function handles input that does not contain any meaningful text.
    The expected behavior is that it should return an overview with no actors and no meaningful analysis.
    """

    text = "iwqhpqidapacacacpasooss"
    result = await visualize_text(text)

    # Check if the result is not None
    assert result is not None
    logger.info("Result: %s", result)

    # Check the structure of the result
    assert isinstance(result, dict)
    assert "overview" in result
    assert "actors" in result
    assert isinstance(result["overview"],dict), "Overview should be a dictionary"
    assert isinstance(result["actors"], list), "Actors should be a list"
    assert len(result["actors"]) == 0
    