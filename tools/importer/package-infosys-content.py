"""
Builds an AEM content package (FileVault) of the imported Infosys pages, to install with the
AEM Package Manager (Tools > Deployment > Packages > Upload, then Install).

Run from the project root after export-infosys-jcr.mjs:
    python3 tools/importer/package-infosys-content.py

It packages migration-work/jcr-content/infosys-poc/<page>.xml as
    /content/uni-eds/infosys-poc/<page>   (photo-gallery, nav, footer)
under an "Infosys POC" parent page, and writes
    migration-work/infosys-poc-content.zip

The images are not in the package: upload content/content/dam/uni-eds/infosys-assets/ to the
DAM folder /content/dam/uni-eds/infosys-assets/ with the Assets console, so AEM processes them.
"""
import os
import zipfile

SITE_ROOT = 'content/uni-eds'
FOLDER = 'infosys-poc'
SOURCE_DIR = os.path.join('migration-work', 'jcr-content', FOLDER)
OUT = os.path.join('migration-work', 'infosys-poc-content.zip')
VERSION = '1.0.0'

NAMESPACES = ('xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0" '
              'xmlns:cq="http://www.day.com/jcr/cq/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0"')

PARENT_PAGE = f'''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root {NAMESPACES} jcr:primaryType="cq:Page">
  <jcr:content cq:template="/libs/core/franklin/templates/page" sling:resourceType="core/franklin/components/page/v1/page" jcr:primaryType="cq:PageContent" jcr:title="Infosys POC"/>
</jcr:root>
'''

FILTER = f'''<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
  <filter root="/{SITE_ROOT}/{FOLDER}"/>
</workspaceFilter>
'''

PROPERTIES = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
  <entry key="name">infosys-poc-content</entry>
  <entry key="group">uni-eds</entry>
  <entry key="version">{VERSION}</entry>
  <entry key="description">Infosys POC pages for Universal Editor: photo-gallery, nav and footer under /{SITE_ROOT}/{FOLDER}. Upload the images to /content/dam/uni-eds/infosys-assets/ separately.</entry>
  <entry key="packageType">content</entry>
</properties>
'''


def main():
    pages = sorted(f[:-4] for f in os.listdir(SOURCE_DIR) if f.endswith('.xml'))
    if not pages:
        raise SystemExit(f'no page XML in {SOURCE_DIR}: run export-infosys-jcr.mjs first')
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('META-INF/vault/filter.xml', FILTER)
        z.writestr('META-INF/vault/properties.xml', PROPERTIES)
        z.writestr(f'jcr_root/{SITE_ROOT}/{FOLDER}/.content.xml', PARENT_PAGE)
        for page in pages:
            with open(os.path.join(SOURCE_DIR, f'{page}.xml'), encoding='utf-8') as f:
                z.writestr(f'jcr_root/{SITE_ROOT}/{FOLDER}/{page}/.content.xml', f.read())
    print(f'{OUT}: /{SITE_ROOT}/{FOLDER} with {", ".join(pages)}')


if __name__ == '__main__':
    main()
