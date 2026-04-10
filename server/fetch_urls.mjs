import { FetchClient, Config } from 'coze-coding-dev-sdk';

const config = new Config();
const client = new FetchClient(config);

async function fetchContent(url, filename) {
  try {
    const response = await client.fetch(url);
    console.log(`\n=== ${filename} ===`);
    console.log(`Status: ${response.status_code === 0 ? 'Success' : 'Failed'}`);
    console.log(`Title: ${response.title || 'N/A'}`);
    
    const textContent = response.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');
    
    // 保存到文件
    const fs = await import('fs');
    fs.writeFileSync(`/tmp/${filename}.txt`, textContent);
    console.log(`Saved to /tmp/${filename}.txt (${textContent.length} chars)`);
  } catch (error) {
    console.error(`Error fetching ${filename}:`, error.message);
  }
}

// 用户提供的URL
const urls = [
  {
    url: 'https://coze-coding-project.tos.coze.site/create_attachment/2026-04-10/1145032086666756_d02eb1446783f88be71abd530ef9f8b6_%E5%88%B6%E5%BA%A6%E4%BF%AE%E6%94%B9%E5%90%8E%E7%89%88%E6%9C%AC.txt?sign=4897871541-49a502974f-0-9fcfc52c49622984c500035715219dc3efe4cded5aa2517b88ec443f37e15f6b',
    filename: 'contract_text'
  },
  {
    url: 'https://coze-coding-project.tos.coze.site/create_attachment/2026-04-10/1145032086666756_784f956b629c264cc9523a3986e58e49_dq2.md?sign=4897871788-abb4d4b451-0-c66f5fa14890688d537507effe0f8dc0c8c79801466e011e5ea4bff67905f315',
    filename: 'reference_contract'
  }
];

(async () => {
  for (const item of urls) {
    await fetchContent(item.url, item.filename);
  }
})();
