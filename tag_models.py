from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from models import Base


class TagCategory(Base):
    """
    Defines categories of tags (e.g., department_tier, contact_role).
    Each category corresponds to a field in the application that supports user-defined tags.
    """
    __tablename__ = 'tag_categories'
    
    category_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)  # e.g., 'department_tier'
    display_name = Column(String(100), nullable=False)  # e.g., 'Department Tier'
    description = Column(Text)
    entity_type = Column(String(50), nullable=False)  # e.g., 'department', 'application'
    field_name = Column(String(50), nullable=False)  # e.g., 'tier', 'status'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    tags = relationship('Tag', back_populates='category', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'category_id': self.category_id,
            'name': self.name,
            'display_name': self.display_name,
            'description': self.description,
            'entity_type': self.entity_type,
            'field_name': self.field_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'tag_count': len(self.tags) if self.tags else 0
        }


class Tag(Base):
    """
    Individual tag values within a category.
    Each tag has a value (stored in database), label (displayed to users), and optional color.
    """
    __tablename__ = 'tags'
    
    tag_id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey('tag_categories.category_id'), nullable=False)
    value = Column(String(50), nullable=False)  # Internal value stored in records
    label = Column(String(100), nullable=False)  # Display label for users
    color = Column(String(20))  # Hex color code for UI (e.g., '#3498DB')
    is_active = Column(Boolean, default=True)  # Allow soft-deletion
    sort_order = Column(Integer, default=0)  # For custom ordering in dropdowns
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    category = relationship('TagCategory', back_populates='tags')
    
    def to_dict(self):
        return {
            'tag_id': self.tag_id,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'value': self.value,
            'label': self.label,
            'color': self.color,
            'is_active': self.is_active,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
