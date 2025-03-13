// File: app/api/updateOptions/route.ts
import {NextResponse} from 'next/server';
import {createClient} from '@/utils/supabase/server';
import * as cheerio from 'cheerio';


export async function GET(request: Request) {
    if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', {status: 401});
    }

    const supabase = createClient();

    // Fetch the webpage HTML
    const response = await fetch('https://sales.ft.org.ua/events');
    const html = await response.text();

    // Load the HTML into Cheerio
    const $ = cheerio.load(html);
    const newOptions: { id: number; name: string }[] = [];

    // Update the selector to match your target element
    $('[data-select="month"] .customSelect__list button').each((i, el) => {
        const optionValue = $(el).attr('data-select-option')?.trim();
        if (optionValue) {
            newOptions.push({id: i, name: optionValue});
        }
    });

    // Fetch stored options from Supabase
    const {data: storedOptions, error: fetchError} = await (await supabase)
        .from('options')
        .select('*');

    if (fetchError) {
        console.error('Error fetching stored options:', fetchError);
        return NextResponse.error();
    }

    // Compare options based on the 'name' field
    function compareOptions(
        storedOptions: { id: number; name: string }[],
        newOptions: { id: number; name: string }[]
    ): boolean {
        const storedNames = storedOptions.map(option => option.name);
        const newNames = newOptions.map(option => option.name);
        if (storedNames.length !== newNames.length) return false;
        for (let i = 0; i < storedNames.length; i++) {
            if (storedNames[i] !== newNames[i]) {
                return false;
            }
        }
        return true;
    }

    // Update options in Supabase if they differ
    async function updateOptionsIfNeeded(
        storedOptions: { id: number; name: string }[],
        newOptions: { id: number; name: string }[]
    ) {
        if (!compareOptions(storedOptions, newOptions)) {
            for (const option of newOptions) {
                const {error: updateError} = await (await supabase)
                    .from('options')
                    .update({name: option.name})
                    .eq('id', option.id);
                if (updateError) {
                    console.error('Error updating option:', updateError);
                }
            }
        }
    }

    await updateOptionsIfNeeded(storedOptions, newOptions);
    return NextResponse.json({message: 'Options updated if needed.'});
}