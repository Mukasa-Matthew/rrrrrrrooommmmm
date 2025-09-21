import express from 'express';
import { UniversityModel } from '../models/University';

const router = express.Router();

// Get all universities
router.get('/', async (req, res) => {
  try {
    const universities = await UniversityModel.findAll();
    res.json({
      success: true,
      data: universities
    });
  } catch (error) {
    console.error('Get universities error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get university by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const university = await UniversityModel.findById(parseInt(id));
    
    if (!university) {
      return res.status(404).json({
        success: false,
        message: 'University not found'
      });
    }

    res.json({
      success: true,
      data: university
    });
  } catch (error) {
    console.error('Get university error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Create new university
router.post('/', async (req, res) => {
  try {
    const universityData = req.body;
    
    // Validate required fields
    if (!universityData.name || !universityData.code || !universityData.region_id) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, and region_id are required'
      });
    }

    const university = await UniversityModel.create(universityData);
    
    res.status(201).json({
      success: true,
      data: university,
      message: 'University created successfully'
    });
  } catch (error: any) {
    console.error('Create university error:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'University code already exists'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Update university
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const university = await UniversityModel.update(parseInt(id), updateData);
    
    if (!university) {
      return res.status(404).json({
        success: false,
        message: 'University not found'
      });
    }

    res.json({
      success: true,
      data: university,
      message: 'University updated successfully'
    });
  } catch (error: any) {
    console.error('Update university error:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'University code already exists'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Delete university
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await UniversityModel.delete(parseInt(id));
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'University not found'
      });
    }

    res.json({
      success: true,
      message: 'University deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete university error:', error);
    
    // Handle foreign key constraint violation
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete university with associated hostels or users'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get regions
router.get('/regions/list', async (req, res) => {
  try {
    const regions = await UniversityModel.getRegions();
    res.json({
      success: true,
      data: regions
    });
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

export default router;
