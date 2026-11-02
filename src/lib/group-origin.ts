import { load } from 'cheerio';
export function fishingGroupIntroduction(html:string):string {
 const $=load(html);
 $('.group-intro .group-eyebrow').text('HOSPEDAGEM PARA GRUPOS DE PESCA');
 $('#group-title').text('Sua viagem de pesca, com a turma organizada.');
 $('.group-hero-copy > p:last-child').text('Escolha as datas, organize os pescadores por quarto e envie sua solicitação para a Flor de Lótus.');
 return $.html();
}
