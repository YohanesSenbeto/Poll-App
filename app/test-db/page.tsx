import { supabase } from "@/lib/supabase";

export default async function TestDBPage() {
    try {
        // Test 1: Check if we can connect to the database
        const { data: polls, error: pollsError } = await supabase
            .from("polls")
            .select("*")
            .limit(1);

        // Test 2: Check if we can query the options table
        const { data: options, error: optionsError } = await supabase
            .from("options")
            .select("*")
            .limit(1);

        // Test 3: Check database schema
        const { data: schema, error: schemaError } = await supabase.rpc(
            "get_table_description",
            { table_name: "polls" }
        );

        return (
            <div className="container mx-auto p-8">
                <h1 className="text-2xl font-bold mb-4">
                    Database Connection Test
                </h1>

                <div className="space-y-4">
                    <div className="p-4 border rounded">
                        <h2 className="font-semibold mb-2">
                            Connection Status
                        </h2>
                        <p
                            className={
                                !pollsError ? "text-green-600" : "text-red-600"
                            }
                        >
                            {!pollsError
                                ? "✅ Connected to database"
                                : `❌ Connection failed: ${pollsError.message}`}
                        </p>
                    </div>

                    <div className="p-4 border rounded">
                        <h2 className="font-semibold mb-2">Tables Found</h2>
                        <ul className="list-disc list-inside">
                            <li>
                                polls:{" "}
                                {!pollsError
                                    ? "✅ Available"
                                    : `❌ Error: ${pollsError.message}`}
                            </li>
                            <li>
                                options:{" "}
                                {!optionsError
                                    ? "✅ Available"
                                    : `❌ Error: ${optionsError.message}`}
                            </li>
                        </ul>
                    </div>

                    <div className="p-4 border rounded">
                        <h2 className="font-semibold mb-2">
                            Environment Variables
                        </h2>
                        <p>
                            URL:{" "}
                            {process.env.NEXT_PUBLIC_SUPABASE_URL
                                ? "✅ Set"
                                : "❌ Missing"}
                        </p>
                        <p>
                            Key:{" "}
                            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                                ? "✅ Set"
                                : "❌ Missing"}
                        </p>
                    </div>

                    <div className="p-4 border rounded">
                        <h2 className="font-semibold mb-2">Sample Data</h2>
                        <pre className="text-sm bg-gray-100 p-2 rounded">
                            {JSON.stringify(
                                {
                                    polls: polls?.slice(0, 2),
                                    options: options?.slice(0, 2),
                                },
                                null,
                                2
                            )}
                        </pre>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        return (
            <div className="container mx-auto p-8">
                <h1 className="text-2xl font-bold mb-4 text-red-600">
                    Database Connection Failed
                </h1>
                <p className="text-red-600">
                    {error instanceof Error ? error.message : "Unknown error"}
                </p>
            </div>
        );
    }
}
