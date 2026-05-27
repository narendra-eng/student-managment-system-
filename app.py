import os
import sys
import subprocess


REQUIRED = ["flask", "flask-cors", "flask-sqlalchemy"]

for pkg in REQUIRED:
    try:
        __import__(pkg.replace("-", "_"))
    except ImportError:
        print(f"Installing {pkg}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg])


from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)


CORS(app)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(BASE_DIR, "students.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

class Student(db.Model):
    __tablename__ = "students"
    id           = db.Column(db.Integer,     primary_key=True)
    name         = db.Column(db.String(120), nullable=False)
    course       = db.Column(db.String(120), nullable=False)
    age          = db.Column(db.Integer,     nullable=False)
    joining_date = db.Column(db.Date,        nullable=False)
    created_at   = db.Column(db.DateTime,    default=datetime.utcnow)

    def to_dict(self):
        return {
            "id"          : self.id,
            "name"        : self.name,
            "course"      : self.course,
            "age"         : self.age,
            "joining_date": self.joining_date.strftime("%Y-%m-%d") if self.joining_date else "",
            "created_at"  : self.created_at.strftime("%d-%m-%Y") if self.created_at else "",
        }


with app.app_context():
    db.create_all()
    print("✅ Database ready:", os.path.join(BASE_DIR, "students.db"))

@app.after_request
def cors_headers(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response


@app.route("/api/<path:p>", methods=["OPTIONS"])
def preflight(p):
    return jsonify({}), 200

def validate(data):
    errors = []
    name   = (data.get("name")   or "").strip()
    course = (data.get("course") or "").strip()

    if not name:
        errors.append("Name is required.")
    if not course:
        errors.append("Course is required.")

    try:
        age = int(data.get("age"))
        if not (1 <= age <= 100):
            errors.append("Age must be between 1 and 100.")
    except (TypeError, ValueError):
        age = None
        errors.append("Age must be a valid number.")

    jd_str = (data.get("joining_date") or "").strip()
    try:
        jd = datetime.strptime(jd_str, "%Y-%m-%d").date()
    except ValueError:
        jd = None
        errors.append("Joining date is required (use date picker).")

    if errors:
        return "; ".join(errors), None

    return None, {"name": name, "course": course, "age": age, "joining_date": jd}


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"success": True, "message": "API is running"}), 200

@app.route("/api/students", methods=["GET"])
def get_all():
    try:
        students = Student.query.order_by(Student.id.desc()).all()
        return jsonify({
            "success"  : True,
            "count"    : len(students),
            "students" : [s.to_dict() for s in students]
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/students/<int:sid>", methods=["GET"])
def get_one(sid):
    try:
        s = db.session.get(Student, sid)
        if not s:
            return jsonify({"success": False, "error": "Student not found."}), 404
        return jsonify({"success": True, "student": s.to_dict()}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/students", methods=["POST"])
def create():
    try:
        data = request.get_json(silent=True) or {}
        err, clean = validate(data)
        if err:
            return jsonify({"success": False, "error": err}), 400

        s = Student(
            name         = clean["name"],
            course       = clean["course"],
            age          = clean["age"],
            joining_date = clean["joining_date"]
        )
        db.session.add(s)
        db.session.commit()
        return jsonify({"success": True, "message": "Student added successfully.", "student": s.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/students/<int:sid>", methods=["PUT"])
def update(sid):
    try:
        s = db.session.get(Student, sid)
        if not s:
            return jsonify({"success": False, "error": "Student not found."}), 404

        data = request.get_json(silent=True) or {}
        err, clean = validate(data)
        if err:
            return jsonify({"success": False, "error": err}), 400

        s.name         = clean["name"]
        s.course       = clean["course"]
        s.age          = clean["age"]
        s.joining_date = clean["joining_date"]
        db.session.commit()
        return jsonify({"success": True, "message": "Student updated successfully.", "student": s.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/students/<int:sid>", methods=["DELETE"])
def delete(sid):
    try:
        s = db.session.get(Student, sid)
        if not s:
            return jsonify({"success": False, "error": "Student not found."}), 404

        name = s.name
        db.session.delete(s)
        db.session.commit()
        return jsonify({"success": True, "message": f"{name} deleted successfully."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    print("\n" + "="*50)
    print("  Student Management System API")
    print("  URL  : http://127.0.0.1:5000")
    print("  Test : http://127.0.0.1:5000/api/health")
    print("="*50 + "\n")
    app.run(debug=True, host="0.0.0.0", port=5000)