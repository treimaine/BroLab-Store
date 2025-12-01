#!/usr/bin/env python3
import re

# Read the file
with open('client/src/pages/home.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match the old price logic
old_pattern = r'''\{\(\(\) => \{
\s+const isFree =
\s+beat\.is_free \|\|
\s+beat\.tags\?\.some\(
\s+\(tag: WooCommerceTag\) => tag\.name\.toLowerCase\(\) === "free"
\s+\) \|\|
\s+beat\.price === 0 \|\|
\s+beat\.price === "0" \|\|
\s+parseFloat\(beat\.price\) === 0 \|\|
\s+false;
\s+return isFree \? \(
\s+<span className="text-\[var\(--accent-cyan\)\]">FREE</span>
\s+\) : \(
\s+`\$?\$?\{beat\.price \|\| "29\.99"\}`
\s+\);
\s+\}\)\(\)\}'''

# New replacement
new_code = '''{isFreeProduct(beat) ? (
                            <span className="text-[var(--accent-cyan)]">FREE</span>
                          ) : (
                            `$${getFormattedPrice(beat)}`
                          )}'''

# Replace all occurrences
content = re.sub(old_pattern, new_code, content, flags=re.MULTILINE)

# Write back
with open('client/src/pages/home.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed home.tsx")
