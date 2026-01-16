print("SCRIPT STARTED")

from transformers import pipeline

print("Loading anomaly detection model...")

detector = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)



print("Model loaded successfully.")

logs = [
    "Failed login attempt by admin from unknown IP",
    "User successfully logged in",
    "Unauthorized access to admin endpoint",
    "Order approved successfully",
    "Permission denied while deleting user"
]

for log in logs:
    result = detector(log)[0]
    label = result["label"]
    score = result["score"]

    print("\nLog:", log)
    print(f"Label: {label}, Score: {score:.4f}")
