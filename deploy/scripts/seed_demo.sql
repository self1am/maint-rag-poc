-- Sites
INSERT INTO sites (site_id, name) VALUES
('SITE_A', 'Site A')
ON CONFLICT (site_id) DO NOTHING;

-- Equipment
INSERT INTO equipment (equipment_uid, site_id, name, type, model) VALUES
('FCU_001', 'SITE_A', 'FCU 1', 'FCU', 'FCU-X'),
('FCU_002', 'SITE_A', 'FCU 2', 'FCU', 'FCU-X'),
('AHU_001', 'SITE_A', 'AHU 1', 'AHU', 'AHU-Z')
ON CONFLICT (equipment_uid) DO NOTHING;

-- Employees
INSERT INTO employees (employee_id, name, site_id, role_level) VALUES
('EMP_001', 'Nimal Perera', 'SITE_A', 'Tech'),
('EMP_002', 'Sahan Jayasinghe', 'SITE_A', 'Senior Tech'),
('EMP_003', 'Dilini Fernando', 'SITE_A', 'Tech'),
('EMP_004', 'Kavindu Silva', 'SITE_A', 'Tech')
ON CONFLICT (employee_id) DO NOTHING;

-- Certs
INSERT INTO employee_certs (employee_id, cert_id, valid_until) VALUES
('EMP_001', 'HVAC_L1', '2027-01-01'),
('EMP_002', 'HVAC_L2', '2027-01-01'),
('EMP_002', 'ELECTRICAL_BASIC', '2027-01-01'),
('EMP_003', 'HVAC_L1', '2026-06-01')
ON CONFLICT (employee_id, cert_id) DO NOTHING;

-- Schedules (next 7 days-ish; adjust if needed)
INSERT INTO maintenance_schedule (equipment_uid, next_date, interval_days, required_certs, est_duration_min, running_hours) VALUES
('FCU_001', CURRENT_DATE + 2, 30, ARRAY['HVAC_L1'], 90, 1200),
('FCU_002', CURRENT_DATE + 5, 30, ARRAY['HVAC_L1'], 90, 980),
('AHU_001', CURRENT_DATE + 6, 60, ARRAY['HVAC_L2'], 180, 2200);

-- Inventory
INSERT INTO inventory (part_id, part_name, site_id, qty_available, reorder_level) VALUES
('PART_001', 'Air Filter FCU-X', 'SITE_A', 12, 5),
('PART_002', 'Belt AHU-Z', 'SITE_A', 2, 3),
('PART_003', 'Thermostat Sensor', 'SITE_A', 0, 2);
