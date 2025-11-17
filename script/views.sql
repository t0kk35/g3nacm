CREATE VIEW v_user_org_access_path AS ( 
SELECT 
    u.id as user_id,
    ou.id as org_unit_id, 
    ou.path as path
FROM users u 
JOIN org_unit_user_access oua on oua.user_id = u.id
JOIN org_unit ou on ou.id = oua.org_unit_id
);

CREATE VIEW v_network_edges AS (
    SELECT 
        'subject' AS "source_type",
        psls.subject_id as "source_id",
        'product' as "destination_type",
        psls.product_id as "destination_id"
    FROM product_subject_link psls
    UNION
    SELECT 
        'product' as "source_type",
        psla.product_id as "source_id",
        'subject' as "destination_type",
        psla.subject_id as "destination_id"
    FROM product_subject_link psla
    UNION
    SELECT 
        'subject' AS "source_type",
        ai.item_id AS "source_id",
        'alert' AS "destination_type",
        ab.id as "destination_id"
    FROM alert_base ab
    JOIN alert_item ai ON ai.alert_id = ab.id
);