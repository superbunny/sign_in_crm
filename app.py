import os
import json
from datetime import datetime, date
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, func, desc
from sqlalchemy.orm import sessionmaker
import google.generativeai as genai

import config
from models import Base, Department, Application, IntegrationStatus, Contact, EngagementActivity, Incident
from database import init_db, seed_data

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config)
CORS(app)

# Initialize database
engine = init_db()
Session = sessionmaker(bind=engine)

# Seed database with sample data
with Session() as session:
    seed_data(session)

# Configure Gemini AI
if config.GEMINI_API_KEY:
    genai.configure(api_key=config.GEMINI_API_KEY)


# ==================== HELPER FUNCTIONS ====================

def get_db_session():
    """Create a new database session."""
    return Session()


def parse_date(date_str):
    """Parse a date string into a date object."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return None


# ==================== MAIN PAGE ====================

@app.route('/')
def index():
    """Render the main CRM page."""
    return render_template('index.html')


# ==================== DASHBOARD API ====================

@app.route('/api/dashboard')
def get_dashboard():
    """Get dashboard statistics."""
    session = get_db_session()
    try:
        # Count departments by status
        total_departments = session.query(Department).count()
        active_departments = session.query(Department).filter_by(status='active').count()
        critical_departments = session.query(Department).filter_by(tier='critical').count()
        
        # Count applications by status
        total_applications = session.query(Application).count()
        live_applications = session.query(Application).filter_by(status='live').count()
        integrating_applications = session.query(Application).filter_by(status='integrating').count()
        
        # Count integrations by risk level
        high_risk = session.query(IntegrationStatus).filter_by(risk_level='high').count()
        blocked = session.query(IntegrationStatus).filter_by(status='blocked').count()
        delayed = session.query(IntegrationStatus).filter_by(status='delayed').count()
        
        # Count open incidents
        open_incidents = session.query(Incident).filter(Incident.status.in_(['open', 'investigating'])).count()
        
        # Recent activities count (last 30 days)
        thirty_days_ago = date.today().replace(day=1) if date.today().day <= 30 else date.today()
        recent_activities = session.query(EngagementActivity).filter(
            EngagementActivity.date >= thirty_days_ago
        ).count()
        
        return jsonify({
            'departments': {
                'total': total_departments,
                'active': active_departments,
                'critical': critical_departments
            },
            'applications': {
                'total': total_applications,
                'live': live_applications,
                'integrating': integrating_applications
            },
            'risk': {
                'high_risk': high_risk,
                'blocked': blocked,
                'delayed': delayed
            },
            'incidents': {
                'open': open_incidents
            },
            'engagement': {
                'recent_activities': recent_activities
            }
        })
    finally:
        session.close()


# ==================== DEPARTMENTS API ====================

@app.route('/api/departments', methods=['GET'])
def get_departments():
    """Get all departments."""
    session = get_db_session()
    try:
        departments = session.query(Department).order_by(Department.name).all()
        return jsonify([d.to_dict() for d in departments])
    finally:
        session.close()


@app.route('/api/departments/<int:department_id>', methods=['GET'])
def get_department(department_id):
    """Get a specific department."""
    session = get_db_session()
    try:
        department = session.query(Department).get(department_id)
        if not department:
            return jsonify({'error': 'Department not found'}), 404
        return jsonify(department.to_dict())
    finally:
        session.close()


@app.route('/api/departments', methods=['POST'])
def create_department():
    """Create a new department."""
    session = get_db_session()
    try:
        data = request.json
        department = Department(
            name=data.get('name'),
            short_name=data.get('short_name'),
            tier=data.get('tier', 'standard'),
            status=data.get('status', 'active'),
            owner_team=data.get('owner_team')
        )
        session.add(department)
        session.commit()
        return jsonify(department.to_dict()), 201
    finally:
        session.close()


@app.route('/api/departments/<int:department_id>', methods=['PUT'])
def update_department(department_id):
    """Update a department."""
    session = get_db_session()
    try:
        department = session.query(Department).get(department_id)
        if not department:
            return jsonify({'error': 'Department not found'}), 404
        
        data = request.json
        if 'name' in data:
            department.name = data['name']
        if 'short_name' in data:
            department.short_name = data['short_name']
        if 'tier' in data:
            department.tier = data['tier']
        if 'status' in data:
            department.status = data['status']
        if 'owner_team' in data:
            department.owner_team = data['owner_team']
        
        session.commit()
        return jsonify(department.to_dict())
    finally:
        session.close()


@app.route('/api/departments/<int:department_id>', methods=['DELETE'])
def delete_department(department_id):
    """Delete a department."""
    session = get_db_session()
    try:
        department = session.query(Department).get(department_id)
        if not department:
            return jsonify({'error': 'Department not found'}), 404
        session.delete(department)
        session.commit()
        return jsonify({'message': 'Department deleted'})
    finally:
        session.close()


# ==================== APPLICATIONS API ====================

@app.route('/api/applications', methods=['GET'])
def get_applications():
    """Get all applications."""
    session = get_db_session()
    try:
        applications = session.query(Application).order_by(Application.app_name).all()
        return jsonify([a.to_dict() for a in applications])
    finally:
        session.close()


@app.route('/api/applications/<int:app_id>', methods=['GET'])
def get_application(app_id):
    """Get a specific application."""
    session = get_db_session()
    try:
        application = session.query(Application).get(app_id)
        if not application:
            return jsonify({'error': 'Application not found'}), 404
        return jsonify(application.to_dict())
    finally:
        session.close()


@app.route('/api/applications', methods=['POST'])
def create_application():
    """Create a new application."""
    session = get_db_session()
    try:
        data = request.json
        application = Application(
            department_id=data.get('department_id'),
            app_name=data.get('app_name'),
            environment=data.get('environment', 'prod'),
            auth_type=data.get('auth_type', 'OIDC'),
            go_live_date=parse_date(data.get('go_live_date')),
            status=data.get('status', 'integrating')
        )
        session.add(application)
        session.flush()
        
        # Create initial integration status
        integration = IntegrationStatus(
            app_id=application.app_id,
            stage='intake',
            status='on_track',
            risk_level='low'
        )
        session.add(integration)
        session.commit()
        return jsonify(application.to_dict()), 201
    finally:
        session.close()


@app.route('/api/applications/<int:app_id>', methods=['PUT'])
def update_application(app_id):
    """Update an application."""
    session = get_db_session()
    try:
        application = session.query(Application).get(app_id)
        if not application:
            return jsonify({'error': 'Application not found'}), 404
        
        data = request.json
        if 'department_id' in data:
            application.department_id = data['department_id']
        if 'app_name' in data:
            application.app_name = data['app_name']
        if 'environment' in data:
            application.environment = data['environment']
        if 'auth_type' in data:
            application.auth_type = data['auth_type']
        if 'go_live_date' in data:
            application.go_live_date = parse_date(data['go_live_date'])
        if 'status' in data:
            application.status = data['status']
        
        session.commit()
        return jsonify(application.to_dict())
    finally:
        session.close()


@app.route('/api/applications/<int:app_id>', methods=['DELETE'])
def delete_application(app_id):
    """Delete an application."""
    session = get_db_session()
    try:
        application = session.query(Application).get(app_id)
        if not application:
            return jsonify({'error': 'Application not found'}), 404
        session.delete(application)
        session.commit()
        return jsonify({'message': 'Application deleted'})
    finally:
        session.close()


# ==================== INTEGRATION STATUS API ====================

@app.route('/api/integrations', methods=['GET'])
def get_integrations():
    """Get all integration statuses."""
    session = get_db_session()
    try:
        integrations = session.query(IntegrationStatus).all()
        return jsonify([i.to_dict() for i in integrations])
    finally:
        session.close()


@app.route('/api/integrations/<int:integration_id>', methods=['PUT'])
def update_integration(integration_id):
    """Update an integration status."""
    session = get_db_session()
    try:
        integration = session.query(IntegrationStatus).get(integration_id)
        if not integration:
            return jsonify({'error': 'Integration not found'}), 404
        
        data = request.json
        if 'stage' in data:
            integration.stage = data['stage']
        if 'status' in data:
            integration.status = data['status']
        if 'risk_level' in data:
            integration.risk_level = data['risk_level']
        if 'notes' in data:
            integration.notes = data['notes']
        
        session.commit()
        return jsonify(integration.to_dict())
    finally:
        session.close()


# ==================== CONTACTS API ====================

@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    """Get all contacts."""
    session = get_db_session()
    try:
        contacts = session.query(Contact).order_by(Contact.name).all()
        return jsonify([c.to_dict() for c in contacts])
    finally:
        session.close()


@app.route('/api/contacts', methods=['POST'])
def create_contact():
    """Create a new contact."""
    session = get_db_session()
    try:
        data = request.json
        contact = Contact(
            department_id=data.get('department_id'),
            name=data.get('name'),
            role=data.get('role'),
            email=data.get('email'),
            phone=data.get('phone'),
            active_flag=data.get('active_flag', True)
        )
        session.add(contact)
        session.commit()
        return jsonify(contact.to_dict()), 201
    finally:
        session.close()


@app.route('/api/contacts/<int:contact_id>', methods=['PUT'])
def update_contact(contact_id):
    """Update a contact."""
    session = get_db_session()
    try:
        contact = session.query(Contact).get(contact_id)
        if not contact:
            return jsonify({'error': 'Contact not found'}), 404
        
        data = request.json
        if 'name' in data:
            contact.name = data['name']
        if 'role' in data:
            contact.role = data['role']
        if 'email' in data:
            contact.email = data['email']
        if 'phone' in data:
            contact.phone = data['phone']
        if 'active_flag' in data:
            contact.active_flag = data['active_flag']
        
        session.commit()
        return jsonify(contact.to_dict())
    finally:
        session.close()


@app.route('/api/contacts/<int:contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    """Delete a contact."""
    session = get_db_session()
    try:
        contact = session.query(Contact).get(contact_id)
        if not contact:
            return jsonify({'error': 'Contact not found'}), 404
        session.delete(contact)
        session.commit()
        return jsonify({'message': 'Contact deleted'})
    finally:
        session.close()


# ==================== ENGAGEMENT ACTIVITIES API ====================

@app.route('/api/activities', methods=['GET'])
def get_activities():
    """Get all engagement activities."""
    session = get_db_session()
    try:
        activities = session.query(EngagementActivity).order_by(desc(EngagementActivity.date)).all()
        return jsonify([a.to_dict() for a in activities])
    finally:
        session.close()


@app.route('/api/activities', methods=['POST'])
def create_activity():
    """Create a new engagement activity."""
    session = get_db_session()
    try:
        data = request.json
        activity = EngagementActivity(
            department_id=data.get('department_id'),
            app_id=data.get('app_id'),
            type=data.get('type'),
            date=parse_date(data.get('date')) or date.today(),
            summary=data.get('summary'),
            next_action=data.get('next_action'),
            owner=data.get('owner')
        )
        session.add(activity)
        session.commit()
        return jsonify(activity.to_dict()), 201
    finally:
        session.close()


@app.route('/api/activities/<int:activity_id>', methods=['DELETE'])
def delete_activity(activity_id):
    """Delete an engagement activity."""
    session = get_db_session()
    try:
        activity = session.query(EngagementActivity).get(activity_id)
        if not activity:
            return jsonify({'error': 'Activity not found'}), 404
        session.delete(activity)
        session.commit()
        return jsonify({'message': 'Activity deleted'})
    finally:
        session.close()


# ==================== INCIDENTS API ====================

@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    """Get all incidents."""
    session = get_db_session()
    try:
        incidents = session.query(Incident).order_by(desc(Incident.created_at)).all()
        return jsonify([i.to_dict() for i in incidents])
    finally:
        session.close()


@app.route('/api/incidents', methods=['POST'])
def create_incident():
    """Create a new incident."""
    session = get_db_session()
    try:
        data = request.json
        incident = Incident(
            app_id=data.get('app_id'),
            severity=data.get('severity'),
            status=data.get('status', 'open'),
            description=data.get('description'),
            root_cause=data.get('root_cause')
        )
        session.add(incident)
        session.commit()
        return jsonify(incident.to_dict()), 201
    finally:
        session.close()


@app.route('/api/incidents/<int:incident_id>', methods=['PUT'])
def update_incident(incident_id):
    """Update an incident."""
    session = get_db_session()
    try:
        incident = session.query(Incident).get(incident_id)
        if not incident:
            return jsonify({'error': 'Incident not found'}), 404
        
        data = request.json
        if 'severity' in data:
            incident.severity = data['severity']
        if 'status' in data:
            incident.status = data['status']
            if data['status'] in ['resolved', 'closed'] and not incident.resolved_at:
                incident.resolved_at = datetime.utcnow()
        if 'description' in data:
            incident.description = data['description']
        if 'root_cause' in data:
            incident.root_cause = data['root_cause']
        
        session.commit()
        return jsonify(incident.to_dict())
    finally:
        session.close()


# ==================== AI CHAT API ====================

def get_database_context(session):
    """Get current database state for AI context."""
    departments = session.query(Department).all()
    applications = session.query(Application).all()
    integrations = session.query(IntegrationStatus).all()
    contacts = session.query(Contact).all()
    activities = session.query(EngagementActivity).order_by(desc(EngagementActivity.date)).limit(20).all()
    incidents = session.query(Incident).all()
    
    return {
        'departments': [d.to_dict() for d in departments],
        'applications': [a.to_dict() for a in applications],
        'integrations': [i.to_dict() for i in integrations],
        'contacts': [c.to_dict() for c in contacts],
        'recent_activities': [a.to_dict() for a in activities],
        'incidents': [i.to_dict() for i in incidents]
    }


SYSTEM_PROMPT = """You are an AI assistant for the Government Identity Service CRM system. 
You help users query and understand data about government departments, their applications, 
integration statuses, contacts, engagement activities, and incidents.

You have access to current database state that includes:
- Departments: Government customers with tier (critical/standard), status, and owner team
- Applications: Software systems that integrate with the sign-in service
- Integration Status: Progress tracking with stages (intake, design, implementation, testing, production)
- Contacts: People at departments with roles (business, technical, security)
- Engagement Activities: Meetings, emails, workshops, and incidents
- Incidents: Issues with applications (severity levels: critical, high, medium, low)

Answer questions concisely and accurately based on the provided data. 
If you need to reference specific entities, use their names.
Format your responses clearly with bullet points when listing multiple items.

IMPORTANT - Chart Generation:
When users ask for charts, graphs, visualizations, or to "show" data visually, you MUST respond with a JSON block containing chart data.
The JSON block should be wrapped in ```chart and ``` markers.

Supported chart types: bar, pie, line, doughnut

Example chart response format:
```chart
{
  "type": "bar",
  "title": "Departments by Tier",
  "labels": ["Critical", "Standard"],
  "datasets": [{
    "label": "Count",
    "data": [3, 3],
    "backgroundColor": ["#E74C3C", "#3498DB"]
  }]
}
```

For pie/doughnut charts, use this format:
```chart
{
  "type": "pie",
  "title": "Application Status Distribution",
  "labels": ["Live", "Integrating", "Deprecated"],
  "datasets": [{
    "data": [6, 3, 1],
    "backgroundColor": ["#27AE60", "#F39C12", "#95A5A6"]
  }]
}
```

Always include a text explanation along with the chart.
"""


@app.route('/api/chat', methods=['POST'])
def chat():
    """AI chat endpoint using Gemini with conversation history support."""
    if not config.GEMINI_API_KEY:
        return jsonify({'error': 'Gemini API key not configured. Please set GEMINI_API_KEY in .env file.'}), 500
    
    db_session = get_db_session()
    try:
        data = request.json
        user_message = data.get('message', '')
        conversation_history = data.get('history', [])  # List of {role, content} messages
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Get current database context
        db_context = get_database_context(db_session)
        context_str = json.dumps(db_context, indent=2)
        
        # Build conversation for Gemini
        model = genai.GenerativeModel(config.GEMINI_MODEL)
        
        # Create the initial context message
        system_context = f"""{SYSTEM_PROMPT}

Current Database State:
{context_str}
"""
        
        # Build chat history for multi-turn conversation
        chat_messages = []
        
        # Add system context as first user message (Gemini doesn't have system role)
        chat_messages.append({
            'role': 'user',
            'parts': [f"[System Context - Do not repeat this]\n{system_context}\n\nI understand. I'll help you with questions about the CRM data. What would you like to know?"]
        })
        chat_messages.append({
            'role': 'model',
            'parts': ["I'm ready to help you query and analyze your Government Identity Service CRM data. I can answer questions about departments, applications, integration statuses, contacts, activities, and incidents. I can also generate charts and visualizations when you ask. What would you like to know?"]
        })
        
        # Add conversation history
        for msg in conversation_history:
            role = 'user' if msg.get('role') == 'user' else 'model'
            chat_messages.append({
                'role': role,
                'parts': [msg.get('content', '')]
            })
        
        # Add current user message
        chat_messages.append({
            'role': 'user',
            'parts': [user_message]
        })
        
        # Start chat and send all messages
        chat = model.start_chat(history=chat_messages[:-1])
        response = chat.send_message(user_message)
        
        return jsonify({
            'response': response.text,
            'status': 'success'
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500
    finally:
        db_session.close()


# ==================== RUN APPLICATION ====================

if __name__ == '__main__':
    print("=" * 60)
    print("Government Identity Service CRM")
    print("=" * 60)
    print(f"Database: {config.DATABASE_PATH}")
    print(f"Gemini AI: {'Configured' if config.GEMINI_API_KEY else 'Not configured (set GEMINI_API_KEY)'}")
    print("=" * 60)
    print("Starting server at http://localhost:5000")
    print("=" * 60)
    app.run(debug=config.DEBUG, port=5000)
