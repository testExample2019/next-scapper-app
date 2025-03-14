// File: app/api/notifyOptionsChange/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
    // Authorization check using CRON_SECRET
    if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = await createClient();

    // Fetch the webpage HTML to retrieve new options
    const url = 'https://next-ecommerce-nine-omega.vercel.app/';
    const response = await fetch(url);
    const html = await response.text();

    // Load the HTML into Cheerio and extract new options
    const $ = cheerio.load(html);
    const newOptions: { id: number; name: string }[] = [];
    const selector = '.grid .product-brand';

    $(selector).each((index, el) => {
        const optionValue = $(el).text()?.trim();
        if (optionValue) {
            newOptions.push({ id: index, name: optionValue });
        }
    });

    // Fetch stored options from Supabase
    const { data: storedOptions, error: fetchError } = await supabase
        .from('options')
        .select('*');

    if (fetchError) {
        console.error('Error fetching stored options:', fetchError);
        return new NextResponse('Error fetching stored options', { status: 500 });
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
                const { error: updateError } = await supabase
                    .from('options')
                    .update({ name: option.name })
                    .eq('id', option.id);
                if (updateError) console.error('Error updating option:', updateError);
            } else {
                const { error: insertError } = await supabase
                    .from('options')
                    .insert(option);
                if (insertError) console.error('Error inserting option:', insertError);
            }
        }

        // Remove options that are no longer present
        const newIds = newOptions.map(o => o.id);
        for (const stored of storedOptions) {
            if (!newIds.includes(stored.id)) {
                const { error: deleteError } = await supabase
                    .from('options')
                    .delete()
                    .eq('id', stored.id);
                if (deleteError) console.error('Error deleting option:', deleteError);
            }
        }

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId) {
            console.error('Telegram bot token or chat ID not configured.');
        } else {
            const message = `Options table updated at ${new Date().toISOString()}.`;
            const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
            const params = new URLSearchParams({
                chat_id: chatId,
                text: message,
            });
            const telegramResponse = await fetch(telegramUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
            });
            if (!telegramResponse.ok) {
                const errText = await telegramResponse.text();
                console.error('Error sending Telegram notification:', errText);
            }
        }
    }


    return NextResponse.json({
        message: 'Options updated if needed',
    });
}