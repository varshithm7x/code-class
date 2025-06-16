'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Toolbar } from './Toolbar';

export const Tiptap = ({
    description,
    onChange,
}: {
    description: string;
    onChange: (richText: string) => void;
}) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure(),
            Underline,
        ],
        content: description,
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert rounded-md border min-h-[150px] border-input bg-back p-4',
            },
        },
        onUpdate({ editor }) {
            onChange(editor.getHTML());
        },
    });

    // Update editor content when description prop changes
    useEffect(() => {
        if (editor && description !== editor.getHTML()) {
            editor.commands.setContent(description);
        }
    }, [editor, description]);

    return (
        <div className='flex flex-col justify-stretch min-h-[250px]'>
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    )
}

