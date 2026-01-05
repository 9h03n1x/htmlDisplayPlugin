import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

export class ImageGenerator {
    
    public static async generatePreview(type: 'direct' | 'file', content: string, isOpen: boolean = false): Promise<string> {
        let html = '';
        let basePath = '';

        if (type === 'file') {
            try {
                if (fs.existsSync(content)) {
                    html = fs.readFileSync(content, 'utf-8');
                    basePath = path.dirname(content);
                }
            } catch (e) {
                console.error('Error reading file:', e);
            }
        } else {
            html = content;
        }

        // 1. Try Meta Tag
        const metaImage = this.extractMetaImage(html, basePath);
        if (metaImage) {
            return this.addStatusIndicator(metaImage, isOpen);
        }

        // 2. Fallback: Generate SVG
        return this.generateSvgPreview(type === 'file' ? path.basename(content) : 'HTML', isOpen);
    }

    private static addStatusIndicator(base64Image: string, isOpen: boolean): string {
        if (!isOpen) return base64Image;

        // Wrap the image in an SVG to add the indicator
        const svg = `
        <svg width="144" height="144" xmlns="http://www.w3.org/2000/svg">
            <image href="${base64Image}" width="144" height="144" />
            <circle cx="124" cy="20" r="10" fill="#00FF00" stroke="white" stroke-width="2" />
        </svg>`;
        
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    }

    private static extractMetaImage(html: string, basePath: string): string | null {
        try {
            const $ = cheerio.load(html);
            const content = $('meta[name="sd-preview"]').attr('content');
            
            if (content) {
                // If it's a base64 string already
                if (content.startsWith('data:image')) {
                    return content;
                }

                // If it's a file path
                if (basePath) {
                    const fullPath = path.resolve(basePath, content);
                    if (fs.existsSync(fullPath)) {
                        const ext = path.extname(fullPath).substring(1);
                        const base64 = fs.readFileSync(fullPath, 'base64');
                        return `data:image/${ext};base64,${base64}`;
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing meta tag:', e);
        }
        return null;
    }

    private static generateSvgPreview(text: string, isOpen: boolean): string {
        // Simple SVG generation
        const indicator = isOpen ? '<circle cx="124" cy="20" r="10" fill="#00FF00" stroke="white" stroke-width="2" />' : '';
        
        const svg = `
        <svg width="144" height="144" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#333"/>
            <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dy=".3em">
                ${text.substring(0, 10)}
            </text>
            <text x="50%" y="70%" font-family="Arial" font-size="12" fill="#aaa" text-anchor="middle">
                HTML
            </text>
            ${indicator}
        </svg>`;
        
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    }
}
