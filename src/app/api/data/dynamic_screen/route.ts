'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { DynamicScreenConfig } from './types';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/data/dynamic_screen'

const query_text = `
SELECT jsonb_build_object(
  'widget_config', COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', dsuwc.widget_id,
      'code', dswr.code,
      'title', dswr.name,
      'config', dsuwc.config
    )
  ), '[]'::jsonb),
  'layout', dsuc.layout
) AS dynamic_screen_config
FROM dynamic_screen_user_config dsuc 
LEFT JOIN dynamic_screen_user_widget_config dsuwc ON dsuwc.dynamic_screen_config_id = dsuc.id
LEFT JOIN dynamic_screen_widget_registry dswr ON dswr.code = dsuwc.widget_code
JOIN users u ON dsuc.user_id = u.id
WHERE u.name = $1
and dsuc.name = $2
GROUP BY dsuc.id, dsuc.layout
`

// Get a user specific layout and config for a dynamic screen
export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // Get the URL params. Throw errors if we can't find the mandatory ones.
    const searchParams = request.nextUrl.searchParams;
    const screenName = searchParams.get("screen_name");
    if (!screenName) return ErrorCreators.param.urlMissing(origin, "screen_name");

    if (!useMockData) {
        const query_dyn_screen = {
            name: origin,
            text: query_text,
            values:[user.name, screenName]
        };
        try {
            const dyn_screen = await db.pool.query(query_dyn_screen);
            const res: DynamicScreenConfig = {
              name: screenName,
              widget_config: dyn_screen.rows[0].dynamic_screen_config.widget_config,
              layout: dyn_screen.rows[0].dynamic_screen_config.layout
            }
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get dynamic screen layout', error as Error);
        }
    }
}