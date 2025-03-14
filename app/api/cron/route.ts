// File: app/api/notifyOptionsChange/route.ts
import {NextResponse} from 'next/server';
import {createClient} from '@/utils/supabase/server';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
    // Authorization check using CRON_SECRET
    if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', {status: 401});
    }
    const supabase = await createClient();

    // Fetch the webpage HTML to retrieve new options

    const url = 'https://next-ecommerce-nine-omega.vercel.app/'
    const response = await fetch(url);
    const html = await response.text();

    // Load the HTML into Cheerio and extract new options
    const $ = cheerio.load(html);
    const newOptions: { id: number; name: string }[] = [];

    const selector = '.grid .product-brand'

    $(selector).each((index, el) => {
        const optionValue = $(el).attr('data-select-option')?.trim();
        if (optionValue) {
            newOptions.push({id: index, name: optionValue});
        }
    });
    // Fetch stored options from Supabase
    const {data: storedOptions, error: fetchError} = await supabase
        .from('options')
        .select('*');

    if (fetchError) {
        console.error('Error fetching stored options:', fetchError);
        return new NextResponse('Error fetching stored options', {status: 500});
    }

    // Helper function to compare stored options with new options (by 'name')
    function compareOptions(
        stored: { id: number; name: string }[],
        updated: { id: number; name: string }[]
    ): boolean {
        const storedNames = stored.map(o => o.name);
        const newNames = updated.map(o => o.name);
        if (storedNames.length !== newNames.length) return false;
        for (let i = 0; i < storedNames.length; i++) {
            if (storedNames[i] !== newNames[i]) return false;
        }
        return true;
    }

    // Function to update options in Supabase if they differ from newOptions
    async function updateOptionsIfNeeded(
        storedOptions: { id: number; name: string }[],
        newOptions: { id: number; name: string }[],
    ) {
        if (!compareOptions(storedOptions, newOptions)) {
            const {error} = await supabase
                .from("options")
                .delete()
                .neq("id", [storedOptions.map(item => item.id)]);
            if (error) {
                console.error("Error deleting rows:", error);
            } else {
                console.log("All rows deleted successfully.");
            }
            const { error: upsertError } = await supabase
                .from('options')
                .upsert(newOptions)
                .select()

            if (upsertError) {
                console.error("Error deleting rows:", upsertError);
            } else {
                console.log("All rows updated successfully.");
            }
        }
    }

    console.log(storedOptions)
    console.log(newOptions)

    await updateOptionsIfNeeded(storedOptions, newOptions);


    return NextResponse.json({
        message: 'Options updated if needed',
    });
}