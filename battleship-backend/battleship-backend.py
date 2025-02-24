from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Enable CORS for all routes and origins (or customize as needed)
CORS(app)

@app.route('/api/get-answer', methods=['POST'])
def get_answer():
    data = request.get_json()
    question = data.get('question', 'No question provided')
    print(f"\nReceived question: {question}")

    # Prompt the human in the terminal for an answer.
    answer = input("Enter the answer for the above question: ")

    # Return the answer as a JSON response.
    return jsonify({'answer': answer})

if __name__ == '__main__':
    app.run(debug=True)