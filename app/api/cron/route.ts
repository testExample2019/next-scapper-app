// File: app/api/updateOptions/route.ts
import {NextResponse} from 'next/server';
import {createClient} from '@/utils/supabase/server';
import * as cheerio from 'cheerio';


export async function GET(request: Request) {
    if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', {status: 401});
    }

    const supabase = await createClient();

    // Fetch the webpage HTML using the built‑in fetch API.
    const url = 'https://next-ecommerce-nine-omega.vercel.app/'
    // const url = 'https://sales.ft.org.ua/events'
    const response = await fetch(url);
    const html = await response.text();

    // Load the HTML into Cheerio.
    const $ = cheerio.load(html);
    const newOptions: { id: number; name: string }[] = [];


    // Update the selector to match your target <select> element.
    const selector = '.grid .product-brand'
    // const selector = '[data-select="month"] .customSelect__list button'
    $(selector).each((_, el) => {
        const optionValue = $(el).text()?.trim();
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
                const existingOption = storedOptions.find(stored => stored.id === option.id);
                if (existingOption) {
                    // Option exists, so update its name
                    const { error: updateError } = await supabase
                        .from('options')
                        .update({ name: option.name })
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
        }
    }


    await updateOptionsIfNeeded(storedOptions, newOptions);
    return NextResponse.json({message: 'Options updated if needed.'});
}