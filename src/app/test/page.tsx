'use server'

import { authorizedPost } from "@/lib/org-filtering";
import { error } from "console";

export default async function Home() {

    const result = await authorizedPost(`${process.env.DATA_URL}/api/action/get_next`, JSON.stringify({}))
        .then(res => { if(!res.ok) throw error('boo'); else return res.json() })
        .then(j => j);

    return (
        <div>
            <h1> Test Page</h1>
            Called the get next and got; {JSON.stringify(result)}
        </div>
    )

}
