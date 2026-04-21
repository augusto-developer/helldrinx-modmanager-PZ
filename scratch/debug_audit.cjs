const crypto = require('crypto');
const path = require('path');

function extractBlocks(content, filePath) {
    const blocks = [];
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.txt') {
      const blockRegex = /([\w]+)\s+([\w\.]+)\s*\{([^}]*)\}/g;
      let match;
      while ((match = blockRegex.exec(content)) !== null) {
        const [full, type, id, body] = match;
        blocks.push({ 
          id, 
          type, 
          content: full.trim(), 
          lineCount: full.trim().split('\n').length 
        });
      }
    } else if (ext === '.xml') {
      const rootTags = ['hairStyles', 'clothing', 'items', 'module', 'models', 'mannequin', 'recipe', 'manifest'];
      const xmlBlockRegex = /<([\w:.-]+)(\s[^>]*)?>([\s\S]*?)<\/\1>|<([\w:.-]+)(\s[^>]*)?\/>/g;
      let match;

      while ((match = xmlBlockRegex.exec(content)) !== null) {
        const full = match[0];
        const tagName = match[1] || match[4];
        const attributes = match[2] || match[5];
        const body = match[3] || '';
        
        if (rootTags.map(t => t.toLowerCase()).includes(tagName.toLowerCase())) {
          blocks.push(...extractBlocks(body, filePath));
          continue;
        }

        let blockId = '';
        if (attributes) {
          const attrMatch = attributes.match(/(?:id|name|ID|m_Name)\s*=\s*(['"])([^'"]+)\1/i);
          if (attrMatch) blockId = attrMatch[2].trim();
        }

        if (!blockId) {
          const innerMatch = body.match(/<(m_Name|m_name|name|id|type|ID)>([^<]+)<\/\1>/i);
          if (innerMatch) blockId = innerMatch[2].trim();
        }

        if (!blockId) {
           blockId = `${tagName}_${crypto.createHash('md5').update(full).digest('hex').substring(0, 6)}`;
        }
        
        blocks.push({ 
          id: blockId, 
          type: tagName, 
          content: full.trim(),
          lineCount: full.trim().split('\n').length
        });
      }
    } else {
      blocks.push({ 
        id: 'file_content', 
        type: 'raw', 
        content,
        lineCount: content.split('\n').length
      });
    }

    return blocks;
}

// TEST CASES
const sampleXML = `
<?xml version="1.0" encoding="utf-8"?>
<hairStyles>
    <style id="Short_Hair">
        <m_Name>ShortHair</m_Name>
        <m_TextureName>Hairstyle1</m_TextureName>
    </style>
    <style name="Goth_Hair">
        <m_Name>Goth_Hair</m_Name>
    </style>
    <tagWithoutId>
        <notId>Value</notId>
    </tagWithoutId>
</hairStyles>
`;

console.log("--- Testing XML Extraction ---");
const blocks = extractBlocks(sampleXML, "hairstyles.xml");
console.log(`Found ${blocks.length} blocks:`);
blocks.forEach(b => console.log(` - [${b.type}] ID: ${b.id} (${b.lineCount} lines)`));

if (blocks.length === 3) {
    console.log("SUCCESS: Extraction working correctly.");
} else {
    console.log("FAILURE: Predicted 3 blocks, found " + blocks.length);
}
