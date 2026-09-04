import { useEffect, useRef, useState } from 'react';
import { Icon } from '../shared/Icon';
import { requestLoadCode, requestOpenFile } from '../state/ui-bus';
import { toast } from '../engine/toast';

const EXT_RE = /\.(mmd|mermaid|mm|txt)$/i;
const ACCEPT = '.mmd,.mermaid,.mm,.txt';

function readAndLoad(file: File) {
    if (!EXT_RE.test(file.name)) {
        toast(`Formato não suportado: “${file.name}” — use .mmd, .mermaid ou .txt`, 'err');
        return;
    }
    file.text().then((code) => {
        requestLoadCode(code, file.name);
    });
}

/** Overlay global de drag & drop + input de arquivo (.mmd/.mermaid). */
export function DropZone() {
    const [over, setOver] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const depth = useRef(0);

    useEffect(() => {
        const hasFiles = (e: DragEvent) =>
            Array.from(e.dataTransfer?.types ?? []).includes('Files');

        const onDragEnter = (e: DragEvent) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            depth.current++;
            setOver(true);
        };
        const onDragOver = (e: DragEvent) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        };
        const onDragLeave = (e: DragEvent) => {
            if (!hasFiles(e)) return;
            depth.current = Math.max(0, depth.current - 1);
            if (depth.current === 0) setOver(false);
        };
        const onDrop = (e: DragEvent) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            depth.current = 0;
            setOver(false);
            const file = e.dataTransfer?.files?.[0];
            if (file) readAndLoad(file);
        };
        const onOpenFile = () => inputRef.current?.click();

        window.addEventListener('dragenter', onDragEnter);
        window.addEventListener('dragover', onDragOver);
        window.addEventListener('dragleave', onDragLeave);
        window.addEventListener('drop', onDrop);
        window.addEventListener('meridian:open-file', onOpenFile);
        return () => {
            window.removeEventListener('dragenter', onDragEnter);
            window.removeEventListener('dragover', onDragOver);
            window.removeEventListener('dragleave', onDragLeave);
            window.removeEventListener('drop', onDrop);
            window.removeEventListener('meridian:open-file', onOpenFile);
        };
    }, []);

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                hidden
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readAndLoad(file);
                    e.target.value = '';
                }}
            />
            {over && (
                <div
                    id="dropOverlay"
                    className="open"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                >
                    <div className="drop-card">
                        <Icon name="upload" size={30} />
                        <strong>Solte para abrir o diagrama</strong>
                        <span>arquivos .mmd, .mermaid ou .txt</span>
                    </div>
                </div>
            )}
        </>
    );
}

export { requestOpenFile };
