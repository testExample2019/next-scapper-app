import {createClient} from '@/utils/supabase/server';
import * as cheerio from "cheerio";

export default async function Home() {
    const supabase = await createClient();

    // Fetch the webpage HTML using the built‑in fetch API.
    const response = await fetch('https://sales.ft.org.ua/events');
    const html = await response.text();

    // Load the HTML into Cheerio.
    const $ = cheerio.load(html);
    const newOptions: { id: number; name: string }[] = [];

    // Update the selector to match your target <select> element.
    $('[data-select="month"] .customSelect__list button').each((_, el) => {
        const optionValue = $(el).attr('data-select-option')?.trim();
        if (optionValue) {
            newOptions.push({
                id: _,
                name: optionValue,
            });
        }
    });

    const {data: storedOptions, error: fetchError} = await supabase
        .from('options')
        .select('*')

    if (fetchError) {
        console.error('Error fetching stored options:', fetchError);
        return;
    }

    // Helper function to compare stored options with new options based on the 'name' field
    function compareOptions(
        storedOptions: { id: number; name: string }[],
        newOptions: { id: number; name: string }[],
    ): boolean {
        // Extract the names from both arrays
        const storedNames = storedOptions.map(option => option.name);
        const newNames = newOptions.map(option => option.name);

        // If lengths differ, the arrays are different
        if (storedNames.length !== newNames.length) return false;

        // Compare each element in order
        for (let i = 0; i < storedNames.length; i++) {
            if (storedNames[i] !== newNames[i]) {
                return false;
            }
        }
        return true;
    }

    // Function to update options in Supabase if they differ from newOptions
    async function updateOptionsIfNeeded(
        storedOptions: { id: number; name: string }[],
        newOptions: { id: number; name: string }[],
    ) {
        if (!compareOptions(storedOptions, newOptions)) {
            // Iterate over each new option and update the corresponding row in the table
            for (const option of newOptions) {
                const {error: updateError} = await supabase
                    .from('options')
                    .update({name: option.name})
                    .eq('id', option.id);
                if (updateError) {
                    console.error('Error updating option:', updateError);
                }
            }
        }
    }

    if (newOptions) {
        await updateOptionsIfNeeded(storedOptions, newOptions);
    }

    return (

            <div className="relative isolate overflow-hidden bg-gray-900 py-16 sm:py-24 lg:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
                        <div className="max-w-xl lg:max-w-lg">
                            <h2 className="text-4xl font-semibold tracking-tight text-white">Subscribe to our newsletter</h2>
                            <p className="mt-4 text-lg text-gray-300">
                                Nostrud amet eu ullamco nisi aute in ad minim nostrud adipisicing velit quis. Duis tempor incididunt
                                dolore.
                            </p>
                            <div className="mt-6 flex max-w-md gap-x-4">
                                <label htmlFor="email-address" className="sr-only">
                                    Email address
                                </label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="Enter your email"
                                    autoComplete="email"
                                    className="min-w-0 flex-auto rounded-md bg-white/5 px-3.5 py-2 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                />
                                <button
                                    type="submit"
                                    className="flex-none rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    Subscribe
                                </button>
                            </div>
                        </div>
                        <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:pt-2">
                            <div className="flex flex-col items-start">
                                <div className="rounded-md bg-white/5 p-2 ring-1 ring-white/10">
                                </div>
                                <dt className="mt-4 text-base font-semibold text-white">Weekly articles</dt>
                                <dd className="mt-2 text-base/7 text-gray-400">
                                    Non laboris consequat cupidatat laborum magna. Eiusmod non irure cupidatat duis commodo amet.
                                </dd>
                            </div>
                            <div className="flex flex-col items-start">
                                <div className="rounded-md bg-white/5 p-2 ring-1 ring-white/10">
                                </div>
                                <dt className="mt-4 text-base font-semibold text-white">No spam</dt>
                                <dd className="mt-2 text-base/7 text-gray-400">
                                    Officia excepteur ullamco ut sint duis proident non adipisicing. Voluptate incididunt anim.
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
                <div aria-hidden="true" className="absolute top-0 left-1/2 -z-10 -translate-x-1/2 blur-3xl xl:-top-6">
                    <div
                        style={{
                            clipPath:
                                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                        }}
                        className="aspect-1155/678 w-[72.1875rem] bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30"
                    />
                </div>
            </div>



)
}
