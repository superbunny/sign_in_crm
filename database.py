from datetime import datetime, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Department, Application, IntegrationStatus, Contact, EngagementActivity, Incident
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


def seed_data(session):
    """Seed the database with sample data."""
    
    # Check if data already exists
    if session.query(Department).first():
        print("Database already contains data. Skipping seed.")
        return
    
    print("Seeding database with sample data...")
    
    # Create Departments
    departments = [
        Department(
            name="Department of Health",
            short_name="DOH",
            tier="critical",
            status="active",
            owner_team="Client Success Alpha"
        ),
        Department(
            name="Employment and Social Development Canada",
            short_name="ESDC",
            tier="critical",
            status="active",
            owner_team="Client Success Alpha"
        ),
        Department(
            name="Canada Revenue Agency",
            short_name="CRA",
            tier="critical",
            status="active",
            owner_team="Client Success Beta"
        ),
        Department(
            name="Department of Fisheries and Oceans",
            short_name="DFO",
            tier="standard",
            status="active",
            owner_team="Client Success Beta"
        ),
        Department(
            name="Parks Canada",
            short_name="PC",
            tier="standard",
            status="active",
            owner_team="Client Success Gamma"
        ),
        Department(
            name="Transport Canada",
            short_name="TC",
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
            auth_type="OIDC",
            go_live_date=date(2024, 3, 15),
            status="live"
        ),
        Application(
            department_id=departments[0].department_id,
            app_name="Vaccine Tracker",
            environment="prod",
            auth_type="OIDC",
            go_live_date=date(2024, 6, 1),
            status="live"
        ),
        # ESDC Apps
        Application(
            department_id=departments[1].department_id,
            app_name="Employment Benefits Portal",
            environment="prod",
            auth_type="SAML",
            go_live_date=date(2023, 11, 20),
            status="live"
        ),
        Application(
            department_id=departments[1].department_id,
            app_name="Social Insurance Registry",
            environment="test",
            auth_type="OIDC",
            status="integrating"
        ),
        # CRA Apps
        Application(
            department_id=departments[2].department_id,
            app_name="My Account",
            environment="prod",
            auth_type="OIDC",
            go_live_date=date(2022, 4, 1),
            status="live"
        ),
        Application(
            department_id=departments[2].department_id,
            app_name="Business Tax Portal",
            environment="prod",
            auth_type="SAML",
            go_live_date=date(2023, 1, 15),
            status="live"
        ),
        # DFO Apps
        Application(
            department_id=departments[3].department_id,
            app_name="Fishing License Portal",
            environment="prod",
            auth_type="OIDC",
            go_live_date=date(2024, 8, 1),
            status="live"
        ),
        Application(
            department_id=departments[3].department_id,
            app_name="Marine Safety System",
            environment="test",
            auth_type="OIDC",
            status="integrating"
        ),
        # Parks Canada
        Application(
            department_id=departments[4].department_id,
            app_name="Park Reservation System",
            environment="prod",
            auth_type="legacy",
            go_live_date=date(2021, 5, 1),
            status="deprecated"
        ),
        # Transport Canada
        Application(
            department_id=departments[5].department_id,
            app_name="Aviation Portal",
            environment="test",
            auth_type="OIDC",
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
                         notes="Technical issues with legacy system integration"),
        IntegrationStatus(app_id=applications[8].app_id, stage="design", status="delayed", risk_level="medium",
                         notes="Migrating from legacy auth to OIDC"),
        IntegrationStatus(app_id=applications[9].app_id, stage="intake", status="on_track", risk_level="low",
                         notes="Initial assessment pending"),
    ]
    session.add_all(integration_statuses)
    
    # Create Contacts
    contacts = [
        Contact(department_id=departments[0].department_id, name="Sarah Chen", role="business", 
                email="sarah.chen@health.gc.ca", phone="613-555-0101"),
        Contact(department_id=departments[0].department_id, name="Michael Brown", role="technical",
                email="michael.brown@health.gc.ca", phone="613-555-0102"),
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
            summary="Initial outreach about OIDC migration for legacy system.",
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
