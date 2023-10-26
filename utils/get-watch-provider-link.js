import fetch from 'node-fetch';
import { load } from 'cheerio';

export default async function (url) {
    let response = await fetch(url,{method:'GET',headers:{'Accept-Language':'ko'}});
    let data = await response.text();
    let $ = load(data);
    let result = {};
    $('div.ott_provider').each((index,item)=>{ // Stream, Buy, Rent
        let type = $(item).find('h3').text().toLowerCase();
        if (type == 'stream') type = 'flatrate';
        result[type] = [];
        $(item).find('li[class^="ott_filter_best_price ott_filter_"]>div>a').each((index,item)=>{
            let price = $(item).parent().find('span.wrapper>span.price').text();
            let presentation_type = $(item).parent().find('span.wrapper>span.presentation_type').text();
            price = price == ''? null : price;
            presentation_type = presentation_type == ''? null : presentation_type;

            result[type].push({
                link:$(item).attr('href'),
                logo_path:$(item).find('img').attr('src').split('/t/p/original')[1],
                price,
                presentation_type
            });
        });
    });
    return result;
};