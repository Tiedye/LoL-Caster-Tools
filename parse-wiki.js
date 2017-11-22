const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const http = require('http');
const util = require('util');
const fs = require('fs');
const open = util.promisify(fs.open);
const write = util.promisify(fs.write);

async function getURL(url) {
  return new Promise((resolve, reject) => http.get(url, res => {
    const { statusCode } = res;
    if (statusCode != 200) {
      throw new Error('Could get page');
    }
    let text = '';
    res.on('data', chunk => text += chunk);
    res.on('end', _ => resolve(text));
  }));
}

async function getChampions() {
  const dom = new JSDOM(await getURL('http://leagueoflegends.wikia.com/wiki/List_of_champions'));
  const table = Array.from(dom.window.document.querySelectorAll('table > tbody')[1].children);
  table.splice(0, 1);
  return table.map(tr => ({
    name: tr.children[0].children[0].children[1].children[0].firstChild.nodeValue,
    link: tr.children[0].children[0].children[1].children[0].href
  }));
}

async function getChampion({ name, link }) {
  const dom = new JSDOM(await getURL(`http://leagueoflegends.wikia.com${link}/Abilities`));
  console.log(`${name} loaded`);
  return {
    name,
    passive: getAbility(dom.window.document.querySelectorAll('.skill_innate')),
    q: getAbility(dom.window.document.querySelectorAll('.skill_q')),
    w: getAbility(dom.window.document.querySelectorAll('.skill_w')),
    e: getAbility(dom.window.document.querySelectorAll('.skill_e')),
    r: getAbility(dom.window.document.querySelectorAll('.skill_r'))
  };
}

function getAbility(skill) {
  const names = Array.from(skill).map(skill => skill.children[0].children[1].children[0].children[0].children[0].children[0].innerHTML.trim());
  if (names.length === 1 || names[0] === names[1]) {
    return names[0];
  } else {
    return `${names[0]} / ${names[1]}`;
  }
}

async function run() {
  champs = await Promise.all((await getChampions()).map(champ => getChampion(champ)));

  const file = await open('output.csv', 'w');

  write(file, `Name,Passive,Q,W,E,R\n`);
  for (const champ of champs) {
    write(file, `${champ.name},${champ.passive},${champ.q},${champ.w},${champ.e},${champ.r}\n`);
  }
}

run();