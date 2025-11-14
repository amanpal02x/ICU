"""
Optimized ICU Vitals Model Trainer (FIXED for our new project structure)
"""

import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# === Dynamic Paths (FIXED) ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Look for the data in our new 'data' folder
CSV_PATH = os.path.normpath(os.path.join(BASE_DIR, "data/summary_features_added_data.csv"))
# Save the model in our new 'models' folder
MODEL_PATH = os.path.normpath(os.path.join(BASE_DIR, "models/vitals_model_tuned.joblib"))

print(f"[INFO] Loading dataset from: {CSV_PATH}")
if not os.path.exists(CSV_PATH):
    raise FileNotFoundError(f"Dataset not found at: {CSV_PATH}. Make sure 'summary_features_added_data.csv' is in the 'backend/data/' folder.")

# === Load dataset ===
df = pd.read_csv(CSV_PATH)
print(f"[INFO] Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")

# === Standardize column names ===
df.columns = [c.strip().replace(" ", "_").lower() for c in df.columns]

# === Expected vitals (This is the 4-course meal) ===
vital_features = ["hr_mean", "sbp_mean", "dbp_mean", "spo2_mean"]

missing = [f for f in vital_features if f not in df.columns]
if missing:
    raise KeyError(f"Missing vital columns in dataset: {missing}")

# === Auto-create label if not present ===
# We will use 'risk_category' if it exists, otherwise make a dummy label
if "risk_category" in df.columns:
    df['label'] = (df['risk_category'].str.lower() == 'high risk').astype(int)
    print("[INFO] Using 'risk_category' as the label.")
elif "label" not in df.columns:
    print("[WARN] 'label' not found — creating dummy label: (hr_mean > 100)")
    df["label"] = (df["hr_mean"] > 100).astype(int)

# === Prepare data ===
X = df[vital_features]
y = df["label"]

# Check if label has more than 1 class
if y.nunique() < 2:
     print("[WARN] The label column has only one value. This will result in a poor model. Using test_size=0.2 anyway.")
     X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
else:
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

# === Train model ===
print("[INFO] Training RandomForest model...")
model = RandomForestClassifier(
    n_estimators=100, # Reduced for speed, 200 is fine too
    random_state=42,
    class_weight="balanced",
    n_jobs=-1
)
model.fit(X_train, y_train)

# === Evaluate ===
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\n✅ Accuracy: {acc:.3f}")
print(classification_report(y_test, y_pred))

# === Save model with features ===
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
# Save the "Box" with the "Brain" and the "Menu"
artifact = {"model": model, "features": vital_features}
joblib.dump(artifact, MODEL_PATH)

print(f"\n✅ Model saved: {MODEL_PATH}")
print(f"✅ Features used: {vital_features}")