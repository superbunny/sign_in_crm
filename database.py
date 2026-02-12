from datetime import datetime, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Department, Application, IntegrationStatus, Contact, EngagementActivity, Incident
from tag_models import TagCategory, Tag
import config


def init_db():
    """Initialize the database and create all tables."""
    engine = create_engine(config.SQLALCHEMY_DATABASE_URI, echo=False)
    Base.metadata.create_all(engine)
    return engine


def get_session(engine):
    """Create a database session."""
    Session = sessionmaker(bind=engine)
    return Session()


def seed_tags(session):
    """Seed tag categories and default tag values."""
    
    # Check if tags already exist
    if session.query(TagCategory).first():
        return
    
    print("Seeding tag categories and values...")
    
    # Define tag categories and their default values
    tag_data = [
        {
            'name': 'department_tier',
            'display_name': 'Department Tier',
            'description': 'Service priority level for departments',
            'entity_type': 'department',
            'field_name': 'tier',
            'tags': [
                {'value': 'critical', 'label': 'Critical', 'color': '#E74C3C', 'sort_order': 1},
                {'value': 'standard', 'label': 'Standard', 'color': '#3498DB', 'sort_order': 2},
            ]
        },
        {
            'name': 'department_status',
            'display_name': 'Department Status',
            'description': 'Operational state of departments',
            'entity_type': 'department',
            'field_name': 'status',
            'tags': [
                {'value': 'active', 'label': 'Active', 'color': '#27AE60', 'sort_order': 1},
                {'value': 'inactive', 'label': 'Inactive', 'color': '#95A5A6', 'sort_order': 2},
            ]
        },
        {
            'name': 'department_owner_team',
            'display_name': 'Owner Team',
            'description': 'Internal team responsible for department relationship',
            'entity_type': 'department',
            'field_name': 'owner_team',
            'tags': [
                {'value': 'Client Success Alpha', 'label': 'Client Success Alpha', 'color': '#9B59B6', 'sort_order': 1},
                {'value': 'Client Success Beta', 'label': 'Client Success Beta', 'color': '#3498DB', 'sort_order': 2},
                {'value': 'Client Success Gamma', 'label': 'Client Success Gamma', 'color': '#1ABC9C', 'sort_order': 3},
            ]
        },
        {
            'name': 'application_environment',
            'display_name': 'Application Environment',
            'description': 'Deployment stage for applications',
            'entity_type': 'application',
            'field_name': 'environment',
            'tags': [
                {'value': 'prod', 'label': 'Production', 'color': '#27AE60', 'sort_order': 1},
                {'value': 'test', 'label': 'Test', 'color': '#F39C12', 'sort_order': 2},
            ]
        },
        {
            'name': 'application_auth_type',
            'display_name': 'Authentication Type',
            'description': 'Authentication protocol used by applications',
            'entity_type': 'application',
            'field_name': 'auth_type',
            'tags': [
                {'value': 'GC Key', 'label': 'GC Key', 'color': '#3498DB', 'sort_order': 1},
                {'value': 'Interact Sign In', 'label': 'Interact Sign In', 'color': '#9B59B6', 'sort_order': 2},
                {'value': 'GCCF Consolidator', 'label': 'GCCF Consolidator', 'color': '#95A5A6', 'sort_order': 3},
            ]
        },
        {
            'name': 'application_status',
            'display_name': 'Application Status',
            'description': 'Integration state of applications',
            'entity_type': 'application',
            'field_name': 'status',
            'tags': [
                {'value': 'live', 'label': 'Live', 'color': '#27AE60', 'sort_order': 1},
                {'value': 'integrating', 'label': 'Integrating', 'color': '#F39C12', 'sort_order': 2},
                {'value': 'deprecated', 'label': 'Deprecated', 'color': '#95A5A6', 'sort_order': 3},
            ]
        },
        {
            'name': 'integration_stage',
            'display_name': 'Integration Stage',
            'description': 'Current phase in integration lifecycle',
            'entity_type': 'integration',
            'field_name': 'stage',
            'tags': [
                {'value': 'intake', 'label': 'Intake', 'color': '#3498DB', 'sort_order': 1},
                {'value': 'design', 'label': 'Design', 'color': '#9B59B6', 'sort_order': 2},
                {'value': 'implementation', 'label': 'Implementation', 'color': '#F39C12', 'sort_order': 3},
                {'value': 'testing', 'label': 'Testing', 'color': '#E67E22', 'sort_order': 4},
                {'value': 'production', 'label': 'Production', 'color': '#27AE60', 'sort_order': 5},
            ]
        },
        {
            'name': 'contact_role',
            'display_name': 'Contact Role',
            'description': 'Function or responsibility of contact',
            'entity_type': 'contact',
            'field_name': 'role',
            'tags': [
                {'value': 'business', 'label': 'Business', 'color': '#3498DB', 'sort_order': 1},
                {'value': 'technical', 'label': 'Technical', 'color': '#9B59B6', 'sort_order': 2},
                {'value': 'security', 'label': 'Security', 'color': '#E74C3C', 'sort_order': 3},
            ]
        },
        {
            'name': 'activity_type',
            'display_name': 'Activity Type',
            'description': 'Kind of engagement activity',
            'entity_type': 'activity',
            'field_name': 'type',
            'tags': [
                {'value': 'meeting', 'label': 'Meeting', 'color': '#3498DB', 'sort_order': 1},
                {'value': 'email', 'label': 'Email', 'color': '#1ABC9C', 'sort_order': 2},
                {'value': 'workshop', 'label': 'Workshop', 'color': '#9B59B6', 'sort_order': 3},
                {'value': 'incident', 'label': 'Incident', 'color': '#E74C3C', 'sort_order': 4},
            ]
        },
    ]
    
    # Create categories and tags
    for cat_data in tag_data:
        category = TagCategory(
            name=cat_data['name'],
            display_name=cat_data['display_name'],
            description=cat_data['description'],
            entity_type=cat_data['entity_type'],
            field_name=cat_data['field_name']
        )
        session.add(category)
        session.flush()
        
        for tag_info in cat_data['tags']:
            tag = Tag(
                category_id=category.category_id,
                value=tag_info['value'],
                label=tag_info['label'],
                color=tag_info['color'],
                sort_order=tag_info['sort_order']
            )
            session.add(tag)
    
    session.commit()
    print("Tag categories and values seeded successfully!")



def seed_data(session):
    """Seed the database with sample data."""
    
    # Seed tags first
    seed_tags(session)
    
    # Check if data already exists
    if session.query(Department).first():
        print("Database already contains data. Skipping seed.")
        return
    
    print("Seeding database with sample data...")
    
    # Create Departments
    departments = [
        Department(
            name="Health Canada",
            acronym="DOH",
            tier="critical",
            status="active",
            owner_team="Client Success Alpha"
        ),
        Department(
            name="Employment and Social Development Canada",
            acronym="ESDC",
            tier="critical",
            status="active",
            owner_team="Client Success Alpha"
        ),
        Department(
            name="Canada Revenue Agency",
            acronym="CRA",
            tier="critical",
            status="active",
            owner_team="Client Success Beta"
        ),
        Department(
            name="Department of Fisheries and Oceans",
            acronym="DFO",
            tier="standard",
            status="active",
            owner_team="Client Success Beta"
        ),
        Department(
            name="Parks Canada",
            acronym="PC",
            tier="standard",
            status="active",
            owner_team="Client Success Gamma"
        ),
        Department(
            name="Transport Canada",
            acronym="TC",
            tier="standard",
            status="inactive",
            owner_team="Client Success Gamma"
        ),
    ]
    session.add_all(departments)
    session.flush()
    
    # Create Applications
    applications = [
        # DOH Apps
        Application(
            department_id=departments[0].department_id,
            app_name="Health Portal",
            environment="prod",
            auth_type="GC Key",
            go_live_date=date(2024, 3, 15),
            status="live"
        ),
        Application(
            department_id=departments[0].department_id,
            app_name="Vaccine Tracker",
            environment="prod",
            auth_type="GC Key",
            go_live_date=date(2024, 6, 1),
            status="live"
        ),
        # ESDC Apps
        Application(
            department_id=departments[1].department_id,
            app_name="Employment Benefits Portal",
            environment="prod",
            auth_type="Interact Sign In",
            go_live_date=date(2023, 11, 20),
            status="live"
        ),
        Application(
            department_id=departments[1].department_id,
            app_name="Social Insurance Registry",
            environment="test",
            auth_type="GC Key",
            status="integrating"
        ),
        # CRA Apps
        Application(
            department_id=departments[2].department_id,
            app_name="My Account",
            environment="prod",
            auth_type="GC Key",
            go_live_date=date(2022, 4, 1),
            status="live"
        ),
        Application(
            department_id=departments[2].department_id,
            app_name="Business Tax Portal",
            environment="prod",
            auth_type="Interact Sign In",
            go_live_date=date(2023, 1, 15),
            status="live"
        ),
        # DFO Apps
        Application(
            department_id=departments[3].department_id,
            app_name="Fishing License Portal",
            environment="prod",
            auth_type="GC Key",
            go_live_date=date(2024, 8, 1),
            status="live"
        ),
        Application(
            department_id=departments[3].department_id,
            app_name="Marine Safety System",
            environment="test",
            auth_type="GC Key",
            status="integrating"
        ),
        # Parks Canada
        Application(
            department_id=departments[4].department_id,
            app_name="Park Reservation System",
            environment="prod",
            auth_type="GCCF Consolidator",
            go_live_date=date(2021, 5, 1),
            status="deprecated"
        ),
        # Transport Canada
        Application(
            department_id=departments[5].department_id,
            app_name="Aviation Portal",
            environment="test",
            auth_type="GC Key",
            status="integrating"
        ),
    ]
    session.add_all(applications)
    session.flush()
    
    # Create Integration Status
    integration_statuses = [
        IntegrationStatus(app_id=applications[0].app_id, stage="production", status="on_track", risk_level="low"),
        IntegrationStatus(app_id=applications[1].app_id, stage="production", status="on_track", risk_level="low"),
        IntegrationStatus(app_id=applications[2].app_id, stage="production", status="on_track", risk_level="low"),
        IntegrationStatus(app_id=applications[3].app_id, stage="testing", status="delayed", risk_level="medium", 
                         notes="Waiting for security review approval"),
        IntegrationStatus(app_id=applications[4].app_id, stage="production", status="on_track", risk_level="low"),
        IntegrationStatus(app_id=applications[5].app_id, stage="production", status="on_track", risk_level="low"),
        IntegrationStatus(app_id=applications[6].app_id, stage="production", status="on_track", risk_level="low"),
        IntegrationStatus(app_id=applications[7].app_id, stage="implementation", status="blocked", risk_level="high",
                         notes="Technical issues with GC Key system integration"),
        IntegrationStatus(app_id=applications[8].app_id, stage="design", status="delayed", risk_level="medium",
                         notes="Migrating from GCCF Consolidator auth to GC Key"),
        IntegrationStatus(app_id=applications[9].app_id, stage="intake", status="on_track", risk_level="low",
                         notes="Initial assessment pending"),
    ]
    session.add_all(integration_statuses)
    
    # Create Contacts
    contacts = [
        Contact(department_id=departments[0].department_id, name="Sarah Chen", role="business", 
                email="sarah.chen@hc-sc.gc.ca", phone="613-555-0101"),
        Contact(department_id=departments[0].department_id, name="Michael Brown", role="technical",
                email="michael.brown@hc-sc.gc.ca", phone="613-555-0102"),
        Contact(department_id=departments[1].department_id, name="Jennifer Williams", role="business",
                email="jennifer.williams@esdc.gc.ca", phone="613-555-0201"),
        Contact(department_id=departments[1].department_id, name="David Kim", role="technical",
                email="david.kim@esdc.gc.ca", phone="613-555-0202"),
        Contact(department_id=departments[1].department_id, name="Lisa Park", role="security",
                email="lisa.park@esdc.gc.ca", phone="613-555-0203"),
        Contact(department_id=departments[2].department_id, name="Robert Thompson", role="business",
                email="robert.thompson@cra.gc.ca", phone="613-555-0301"),
        Contact(department_id=departments[2].department_id, name="Amanda Lee", role="technical",
                email="amanda.lee@cra.gc.ca", phone="613-555-0302"),
        Contact(department_id=departments[3].department_id, name="James Wilson", role="business",
                email="james.wilson@dfo.gc.ca", phone="613-555-0401"),
        Contact(department_id=departments[4].department_id, name="Emily Davis", role="technical",
                email="emily.davis@pc.gc.ca", phone="613-555-0501"),
        Contact(department_id=departments[5].department_id, name="Chris Martin", role="business",
                email="chris.martin@tc.gc.ca", phone="613-555-0601", active_flag=False),
    ]
    session.add_all(contacts)
    
    # Create Engagement Activities
    today = date.today()
    activities = [
        EngagementActivity(
            department_id=departments[0].department_id,
            type="meeting",
            date=today - timedelta(days=5),
            summary="Quarterly review meeting. Discussed new vaccination requirements.",
            next_action="Send updated compliance checklist",
            owner="John Smith"
        ),
        EngagementActivity(
            department_id=departments[1].department_id,
            app_id=applications[3].app_id,
            type="workshop",
            date=today - timedelta(days=10),
            summary="Technical workshop for Social Insurance Registry integration.",
            next_action="Schedule follow-up technical session",
            owner="Jane Doe"
        ),
        EngagementActivity(
            department_id=departments[1].department_id,
            type="email",
            date=today - timedelta(days=2),
            summary="Security review questions from ESDC security team.",
            next_action="Prepare security documentation package",
            owner="Jane Doe"
        ),
        EngagementActivity(
            department_id=departments[2].department_id,
            type="meeting",
            date=today - timedelta(days=15),
            summary="Annual service review. CRA satisfied with performance.",
            next_action="None required",
            owner="Bob Johnson"
        ),
        EngagementActivity(
            department_id=departments[3].department_id,
            app_id=applications[7].app_id,
            type="incident",
            date=today - timedelta(days=3),
            summary="Integration test failures blocking Marine Safety System.",
            next_action="Escalate to platform engineering",
            owner="Alice Wong"
        ),
        EngagementActivity(
            department_id=departments[4].department_id,
            type="email",
            date=today - timedelta(days=45),
            summary="Initial outreach about GC Key migration for GCCF Consolidator system.",
            next_action="Schedule discovery call",
            owner="Tom Harris"
        ),
    ]
    session.add_all(activities)
    
    # Create Incidents
    incidents = [
        Incident(
            app_id=applications[4].app_id,
            severity="medium",
            status="resolved",
            description="Intermittent login failures during peak hours",
            root_cause="Session timeout configuration was too aggressive",
            created_at=datetime.now() - timedelta(days=30),
            resolved_at=datetime.now() - timedelta(days=29)
        ),
        Incident(
            app_id=applications[7].app_id,
            severity="high",
            status="open",
            description="Integration test failures preventing deployment",
            root_cause=None,
            created_at=datetime.now() - timedelta(days=3)
        ),
        Incident(
            app_id=applications[2].app_id,
            severity="low",
            status="closed",
            description="Minor UI glitch on login page",
            root_cause="CSS caching issue",
            created_at=datetime.now() - timedelta(days=60),
            resolved_at=datetime.now() - timedelta(days=59)
        ),
    ]
    session.add_all(incidents)
    
    session.commit()
    print("Database seeded successfully!")


if __name__ == "__main__":
    engine = init_db()
    session = get_session(engine)
    seed_data(session)
    session.close()
    print("Database initialization complete.")
