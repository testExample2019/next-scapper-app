import {createClient} from '@/utils/supabase/server';
import * as cheerio from "cheerio";

export default async function Home() {
    const supabase = await createClient();

    // Fetch the webpage HTML using the built‑in fetch API.
    // const url = 'https://next-ecommerce-nine-omega.vercel.app/'
    const url = 'https://sales.ft.org.ua/events';
    const response = await fetch(url);
    const html = await response.text();

    // Load the HTML into Cheerio.
    const $ = cheerio.load(html);
    const newOptions: { id: number; name: string }[] = [];


    // Update the selector to match your target <select> element.
    // const selector = '.grid .product-brand'
    const selector = '[data-select="month"] .customSelect__list button';
    $(selector).each((_, el) => {
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
        arr1: { id: number; name: string }[],
        arr2: { id: number; name: string }[]
    ): boolean {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i].id !== arr2[i].id || arr1[i].name !== arr2[i].name) {
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
            // Remove options from storedOptions that are not present in newOptions
            const newOptionIds = newOptions.map(option => option.id);
            for (const storedOption of storedOptions) {
                if (!newOptionIds.includes(storedOption.id)) {
                    const {error: deleteError} = await supabase
                        .from('options')
                        .delete()
                        .eq('id', storedOption.id);
                    if (deleteError) {
                        console.error('Error deleting option:', deleteError);
                    }
                }
            }
            // Iterate over each new option and update the corresponding row in the table
            for (const option of newOptions) {
                const existingOption = storedOptions.find(stored => stored.id === option.id);
                if (existingOption) {
                    // Option exists, so update its name
                    const {error: updateError} = await supabase
                        .from('options')
                        .update({name: option.name})
                        .eq('id', option.id);
                    if (updateError) {
                        console.error('Error updating option:', updateError);
                    }
                } else {
                    // Option does not exist, so insert it
                    const {error: insertError} = await supabase
                        .from('options')
                        .insert(option);
                    if (insertError) {
                        console.error('Error inserting option:', insertError);
                    }
                }
            }
        }
    }

    await updateOptionsIfNeeded(storedOptions, newOptions);

    return (

        <div className="relative isolate h-screen overflow-hidden bg-gray-900 py-16 sm:py-24 lg:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
                    <div className="max-w-xl lg:max-w-lg">
                        <h2 className="text-4xl font-semibold tracking-tight text-white">Subscribed to theater
                            changes</h2>

                        <div className="max-w-4xl mx-auto shadow-md rounded-lg p-6">
                            <h2 className="text-2xl font-semibold text-gray-100 mb-4">Stored Options List</h2>
                            {storedOptions.length > 0 ? (
                                <ul className="space-y-2">
                                    {newOptions.map(option => (
                                        <li
                                            key={option.id}
                                            className="flex items-center justify-between bg-gray-200 p-3 rounded-md shadow-sm"
                                        >
                                            <span className="text-gray-700">{option.name}</span>
                                            <span className="text-gray-500 text-sm">ID: {option.id}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500">No options found.</p>
                            )}
                        </div>

                    </div>

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
