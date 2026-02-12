from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Department(Base):
    """
    Departments represent government customers/clients.
    
    Semantic definitions:
    - tier: Service priority level ('critical' = mission-essential, 'standard' = regular service)
    - status: Operational state ('active' = currently engaged, 'inactive' = dormant or offboarded)
    - owner_team: Internal team responsible for relationship management
    """
    __tablename__ = 'departments'
    
    department_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    acronym = Column(String(50))
    tier = Column(String(20), default='standard')  # critical / standard
    status = Column(String(20), default='active')  # active / inactive
    owner_team = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    applications = relationship('Application', back_populates='department', cascade='all, delete-orphan')
    contacts = relationship('Contact', back_populates='department', cascade='all, delete-orphan')
    activities = relationship('EngagementActivity', back_populates='department', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'department_id': self.department_id,
            'name': self.name,
            'acronym': self.acronym,
            'tier': self.tier,
            'status': self.status,
            'owner_team': self.owner_team,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'app_count': len(self.applications) if self.applications else 0
        }


class Application(Base):
    """
    Applications are software systems owned by departments that integrate with the sign-in service.
    
    Semantic definitions:
    - environment: Deployment stage ('prod' = production, 'test' = non-production)
    - auth_type: Authentication protocol ('GC Key' = OpenID Connect, 'Interact Sign In' = Security Assertion Markup Language, 'GCCF Consolidator' = older protocols)
    - status: Integration state ('live' = in production, 'integrating' = in progress, 'deprecated' = being phased out)
    """
    __tablename__ = 'applications'
    
    app_id = Column(Integer, primary_key=True, autoincrement=True)
    department_id = Column(Integer, ForeignKey('departments.department_id'), nullable=False)
    app_name = Column(String(255), nullable=False)
    environment = Column(String(20), default='prod')  # prod / test
    auth_type = Column(Text, default='GC Key')  # GC Key, Interact Sign In, etc. (comma-separated)
    go_live_date = Column(Date)
    status = Column(String(30), default='integrating')  # live / integrating / deprecated
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    department = relationship('Department', back_populates='applications')
    integration_status = relationship('IntegrationStatus', back_populates='application', uselist=False, cascade='all, delete-orphan')
    incidents = relationship('Incident', back_populates='application', cascade='all, delete-orphan')
    activities = relationship('EngagementActivity', back_populates='application')
    
    def to_dict(self):
        return {
            'app_id': self.app_id,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'app_name': self.app_name,
            'environment': self.environment,
            'auth_type': self.auth_type,
            'go_live_date': self.go_live_date.isoformat() if self.go_live_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class IntegrationStatus(Base):
    """
    Tracks the progress of application integration with the sign-in service.
    This is the PRIMARY SOURCE OF TRUTH for integration progress.
    
    Semantic definitions:
    - stage: Current phase in the integration lifecycle:
        'intake' = Initial request received
        'design' = Architecture/design phase
        'implementation' = Active development
        'testing' = QA and validation
        'production' = Successfully deployed
    - status: Progress indicator ('on_track' = proceeding normally, 'blocked' = waiting on external factor, 'delayed' = behind schedule)
    - risk_level: Assessment of integration risk ('low' = expected to succeed, 'medium' = some concerns, 'high' = significant issues)
    """
    __tablename__ = 'integration_status'
    
    integration_id = Column(Integer, primary_key=True, autoincrement=True)
    app_id = Column(Integer, ForeignKey('applications.app_id'), nullable=False, unique=True)
    stage = Column(String(30), default='intake')  # intake / design / implementation / testing / production
    status = Column(String(20), default='on_track')  # on_track / blocked / delayed
    risk_level = Column(String(20), default='low')  # low / medium / high
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text)
    
    # Relationships
    application = relationship('Application', back_populates='integration_status')
    
    def to_dict(self):
        return {
            'integration_id': self.integration_id,
            'app_id': self.app_id,
            'app_name': self.application.app_name if self.application else None,
            'department_name': self.application.department.name if self.application and self.application.department else None,
            'stage': self.stage,
            'status': self.status,
            'risk_level': self.risk_level,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'notes': self.notes
        }


class Contact(Base):
    """
    Contacts are people associated with departments.
    
    Semantic definitions:
    - role: Contact's function ('business' = decision maker, 'technical' = developer/architect, 'security' = compliance/security officer)
    - active_flag: Whether this contact is currently valid for communication
    """
    __tablename__ = 'contacts'
    
    contact_id = Column(Integer, primary_key=True, autoincrement=True)
    department_id = Column(Integer, ForeignKey('departments.department_id'), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(30))  # business / technical / security
    email = Column(String(255))
    phone = Column(String(30))
    active_flag = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    department = relationship('Department', back_populates='contacts')
    
    def to_dict(self):
        return {
            'contact_id': self.contact_id,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'name': self.name,
            'role': self.role,
            'email': self.email,
            'phone': self.phone,
            'active_flag': self.active_flag,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class EngagementActivity(Base):
    """
    Tracks all interactions and engagements with departments/applications.
    
    Semantic definitions:
    - type: Kind of engagement ('meeting' = scheduled discussion, 'email' = written correspondence, 
            'workshop' = collaborative working session, 'incident' = issue-related interaction)
    - summary: Brief description of what happened
    - next_action: Follow-up task or commitment
    - owner: Internal team member responsible for follow-up
    """
    __tablename__ = 'engagement_activities'
    
    activity_id = Column(Integer, primary_key=True, autoincrement=True)
    department_id = Column(Integer, ForeignKey('departments.department_id'), nullable=False)
    app_id = Column(Integer, ForeignKey('applications.app_id'), nullable=True)
    type = Column(String(30))  # meeting / email / workshop / incident
    date = Column(Date, default=datetime.utcnow)
    summary = Column(Text)
    next_action = Column(Text)
    owner = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    department = relationship('Department', back_populates='activities')
    application = relationship('Application', back_populates='activities')
    
    def to_dict(self):
        return {
            'activity_id': self.activity_id,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'app_id': self.app_id,
            'app_name': self.application.app_name if self.application else None,
            'type': self.type,
            'date': self.date.isoformat() if self.date else None,
            'summary': self.summary,
            'next_action': self.next_action,
            'owner': self.owner,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Incident(Base):
    """
    Tracks incidents related to applications.
    
    Semantic definitions:
    - severity: Impact level ('critical' = service down, 'high' = major impact, 'medium' = partial impact, 'low' = minor issue)
    - status: Current state ('open' = active issue, 'investigating' = being analyzed, 'resolved' = fixed, 'closed' = complete)
    - root_cause: Explanation of what caused the incident
    """
    __tablename__ = 'incidents'
    
    incident_id = Column(Integer, primary_key=True, autoincrement=True)
    app_id = Column(Integer, ForeignKey('applications.app_id'), nullable=False)
    severity = Column(String(20))  # critical / high / medium / low
    status = Column(String(20), default='open')  # open / investigating / resolved / closed
    description = Column(Text)
    root_cause = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)
    
    # Relationships
    application = relationship('Application', back_populates='incidents')
    
    def to_dict(self):
        return {
            'incident_id': self.incident_id,
            'app_id': self.app_id,
            'app_name': self.application.app_name if self.application else None,
            'department_name': self.application.department.name if self.application and self.application.department else None,
            'severity': self.severity,
            'status': self.status,
            'description': self.description,
            'root_cause': self.root_cause,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
        }
