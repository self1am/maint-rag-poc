from datetime import date


def seed_demo(conn) -> dict:
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO sites (site_id, name)
        VALUES ('SITE-001', 'Main Plant')
        ON CONFLICT (site_id) DO UPDATE SET name = EXCLUDED.name
        """
    )

    cursor.execute(
        """
        INSERT INTO equipment (equipment_uid, site_id, name)
        VALUES
            ('EQ-100', 'SITE-001', 'Hydraulic Press'),
            ('EQ-200', 'SITE-001', 'Conveyor Line')
        ON CONFLICT (equipment_uid) DO UPDATE SET
            site_id = EXCLUDED.site_id,
            name = EXCLUDED.name
        """
    )

    cursor.execute(
        """
        INSERT INTO employees (employee_id, site_id, name)
        VALUES
            ('EMP-01', 'SITE-001', 'Avery Chen'),
            ('EMP-02', 'SITE-001', 'Morgan Lee'),
            ('EMP-03', 'SITE-001', 'Riley Patel')
        ON CONFLICT (employee_id) DO UPDATE SET
            site_id = EXCLUDED.site_id,
            name = EXCLUDED.name
        """
    )

    cursor.execute("DELETE FROM employee_certs WHERE employee_id IN ('EMP-01','EMP-02','EMP-03')")
    cursor.execute(
        """
        INSERT INTO employee_certs (employee_id, cert)
        VALUES
            ('EMP-01', 'HYDRAULICS'),
            ('EMP-01', 'LOCKOUT'),
            ('EMP-02', 'ELECTRICAL'),
            ('EMP-03', 'LOCKOUT')
        """
    )

    cursor.execute(
        """
        INSERT INTO maintenance_schedule (site_id, equipment_uid, next_date, required_certs, est_duration_min)
        VALUES
            ('SITE-001', 'EQ-100', %s, ARRAY['HYDRAULICS','LOCKOUT'], 120),
            ('SITE-001', 'EQ-200', %s, ARRAY['LOCKOUT'], 90)
        ON CONFLICT DO NOTHING
        """,
        (date.today().isoformat(), date.today().isoformat()),
    )

    cursor.execute(
        """
        INSERT INTO inventory (site_id, part_id, part_name, qty, reorder_level)
        VALUES
            ('SITE-001', 'PART-100', 'Hydraulic Hose', 4, 2),
            ('SITE-001', 'PART-200', 'Conveyor Belt', 1, 1)
        ON CONFLICT (site_id, part_id) DO UPDATE SET
            part_name = EXCLUDED.part_name,
            qty = EXCLUDED.qty,
            reorder_level = EXCLUDED.reorder_level
        """
    )

    conn.commit()
    return {"status": "ok"}
