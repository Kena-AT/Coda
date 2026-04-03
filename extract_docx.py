import zipfile
import sys
from xml.etree import ElementTree

def extract_docx(file_path):
    z = zipfile.ZipFile(file_path)
    xml_content = z.read('word/document.xml')
    tree = ElementTree.fromstring(xml_content)
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    paragraphs = tree.findall('.//w:p', ns)
    for p in paragraphs:
        texts = p.findall('.//w:t', ns)
        line = ''.join([t.text for t in texts if t.text])
        if line:
            sys.stdout.buffer.write((line + '\n').encode('utf-8'))

if __name__ == "__main__":
    extract_docx('Coda Full Description.docx')
