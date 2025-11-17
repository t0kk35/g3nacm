'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { NetworkData, NetworkLink, NetworkNode } from '../types';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/data/subject/network'

const edges_query_text = `
WITH RECURSIVE network AS ( 
    SELECT 
        NULL::TEXT AS "source_type",
        NULL::UUID AS "source_id",  -- No parent for the starting node
        'subject' AS "destination_type",
        sb.id AS "destination_id",
        'start' AS "role",
        sb.acquisition_date AS "date_time",        
        1 AS "depth",  -- Start at depth 1
        ARRAY['null->subject@' || sb.id]::TEXT[] AS "path"
    FROM subject_base sb
    WHERE sb.id = $1
    UNION ALL
    SELECT
        n.destination_type as "source_type",
        n.destination_id AS "source_id", 
        ne.destination_type AS "destination_type",
        ne.destination_id AS "destination_id",
        ne.role AS "role",
        ne.date_time as "date_time",
        n.depth + 1 AS "depth",
        n.path || (n.destination_type || '@' || n.destination_id::TEXT || '->' || ne.destination_type || '@' || ne.destination_id::TEXT) as "path"
    FROM network n
    JOIN v_network_edges ne 
    ON ne.source_type = n.destination_type
    AND ne.source_id = n.destination_id
    -- Make sure not to select an edge again
    WHERE (n.destination_type || '@' || n.destination_id::TEXT || '->' || ne.destination_type || '@' || ne.destination_id::TEXT) <> ALL(n.path)
    -- Make sure not to backtrack on a edge
    AND (ne.destination_type || '@' || ne.destination_id::TEXT || '->' || n.destination_type || '@' || n.destination_id::TEXT) <> ALL(n.path)
    -- Apply a max number of hops.
    AND n.depth < 3
)
SELECT 
    source_id AS "source_id",
    source_type AS "source_type",
    destination_id AS "destination_id",
    destination_type as "destination_type",
    role as "role",
    date_time as "date_time"
FROM network WHERE source_id IS NOT NULL
`

const nodes_query_text = `
SELECT 
    sb.id AS "id",
    'subject' AS "type",
    sb.name AS "name",
    sb.acquisition_date AS "date_time",
    jsonb_build_object(
        'Identifier', sb.identifier,
        'Name', sb.name,
        'KYC Risk', sb.kyc_risk,
        'Segment', sb.segment,
        'Aquisition Date', TO_CHAR(sb.acquisition_date, 'YYYY-MM-DD'),
        'Status', sb.status,
        'Organisational Unit', sb.org_unit_code
    ) AS "details"
FROM subject_base sb
JOIN org_unit ou ON ou.code = sb.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
WHERE sb.id = ANY($2)
AND u.name = $1
UNION
SELECT 
    pb.id AS "id",
    'product' AS "type",
    pb.identifier AS "name",
    pb.opened_date_time AS "date_time",
    jsonb_build_object(
        'Identifier', pb.identifier,
        'Type', pb.product_type,
        'Category', pb.category,
        'Organisational Unit', pb.org_unit_code
    ) AS "details"
FROM product_base pb
JOIN org_unit ou ON ou.code = pb.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
WHERE pb.id = ANY($3)
AND u.name = $1
UNION
SELECT 
    ab.id AS "id",
    'alert' AS "type",
    ab.alert_identifier AS "name",
    ab.create_date_time AS "date_time",
    jsonb_build_object(
        'Identifier', ab.alert_identifier,
        'Type', ab.alert_type,
        'Description', ab.description,
        'Creation', TO_CHAR(ab.create_date_time, 'YYYY-MM-DD'),
        'Organisational Unit', ab.org_unit_code,
        'State', wes.to_state_name,
        'Assigned to', COALESCE(wes.assigned_to_user_name, 'No one')
    ) AS "details"
FROM alert_base ab
JOIN workflow_entity_state wes ON ab.id = wes.entity_id and ab.entity_code = wes.entity_code
JOIN org_unit ou ON ou.code = ab.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
WHERE ab.id = ANY($4)
AND u.name = $1
`

export async function GET(request: NextRequest ) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    // User Checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    
    // Get the URL params. Throw errors if we can't find the mandatory ones.
    const searchParams = request.nextUrl.searchParams;
    const subjectId = searchParams.get("subject_id");
    if (!subjectId) return ErrorCreators.param.urlMissing(origin, "subject_id");

    if (!useMockData) {
        // First fetch the edges. With a recursive CTE. We're not going to worry to much about org filtering yet
        const edges_query = {
            name: 'api_data_subject_network_edge',
            text: edges_query_text,
            values:[subjectId]
        }

        let links:NetworkLink[]

        try {
            const subject_edges = await db.pool.query(edges_query)
            links = subject_edges.rows
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get subject network edges', error as Error);
        }

        // Make a map of the unique entities per entity type.
        const unique_entities = new Map<string, string[]>();
        ['subject', 'product', 'alert'].map(et => {
            const entities = links
                .filter(l => l.source_type === et || l.destination_type === et)
                .map(l => l.source_type === et ? l.source_id : l.destination_id);
            unique_entities.set(et, [...new Set(entities)]);
        })

        // Now fetch the nodes. This time we org-unit filtering.
        const node_query = {
            name: 'api_data_subject_network_node',
            text: nodes_query_text,
            values:[
                user.name, 
                unique_entities.get('subject'),
                unique_entities.get('product'),
                unique_entities.get('alert')
            ]
        }
        try {
            const subject_nodes_res = await db.pool.query(node_query)
            const nodes:NetworkNode[] = subject_nodes_res.rows
            // Now filter the edges, there might be some unconnected ones bencause of the org filtering.
            const lookup_nodes = new Set(nodes.map(n => n.type+'@'+n.id))
            links.filter(l => lookup_nodes.has(l.source_type+'@'+l.source_id) && lookup_nodes.has(l.destination_type+'@'+l.destination_id))
            
            const network: NetworkData = {
                nodes: nodes,
                links: links
            }
            return NextResponse.json(network);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get subject nodes', error as Error);
        }

    }
}