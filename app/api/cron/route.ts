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
    const url = 'https://sales.ft.org.ua/events';
    const response = await fetch(url);
    const html = await response.text();

    // Load the HTML into Cheerio and extract new options
    const $ = cheerio.load(html);
    const newOptions: { id: number; name: string }[] = [];
    const selector = '[data-select="month"] .customSelect__list button'

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

    // Update options in Supabase if there is a difference
    if (!compareOptions(storedOptions, newOptions)) {
        // Update existing options or insert new ones
        for (const option of newOptions) {
            const existing = storedOptions.find(o => o.id === option.id);
            if (existing) {
                const {error: updateError} = await supabase
                    .from('options')
                    .update({name: option.name})
                    .eq('id', option.id);
                if (updateError) console.error('Error updating option:', updateError);
            } else {
                const {error: insertError} = await supabase
                    .from('options')
                    .insert(option);
                if (insertError) console.error('Error inserting option:', insertError);
            }
        }

        // Remove options that are no longer present
        const newIds = newOptions.map(o => o.id);
        for (const stored of storedOptions) {
            if (!newIds.includes(stored.id)) {
                const {error: deleteError} = await supabase
                    .from('options')
                    .delete()
                    .eq('id', stored.id);
                if (deleteError) console.error('Error deleting option:', deleteError);
            }
        }

        await supabase.functions.invoke('telegramNotification', {
            body: {name: 'Functions'},
        })
    }


    return NextResponse.json({
        message: 'Options updated if needed',
    });
}