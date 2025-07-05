
from fastapi.testclient import TestClient
from server.main import app

client = TestClient(app)

#TODO Write test for this endpoint

def test_question_withfile_visualize():
    """
    Test the /analysis/question/with-file/visualize endpoint
    """
    # response = client.post(
    #     "/analysis/question/with-file/visualize",
    #     json={

    #     }
    # )
