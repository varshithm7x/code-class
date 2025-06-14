'use client';

import type { Editor } from '@tiptap/react';
import {
    Bold,
    Strikethrough,
    Italic,
    List,
    ListOrdered,
    Underline,
    Quote,
    Undo,
    Redo,
} from 'lucide-react';

export const Toolbar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) {
        return null;
    }
    return (
        <div
            className="px-4 py-3 rounded-tl-md rounded-tr-md flex justify-between items-start
    gap-5 w-full flex-wrap border border-input bg-transparent"
        >
            <div className="flex justify-start items-center gap-5 w-full lg:w-10/12 flex-wrap ">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleBold().run();
                    }}
                    className={
                        editor.isActive('bold')
                            ? 'bg-primary text-white p-2 rounded-lg'
                            : 'text-primary'
                    }
                >
                    <Bold className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleItalic().run();
                    }}
                    className={
                        editor.isActive('italic')
                            ? 'bg-primary text-white p-2 rounded-lg'
                            : 'text-primary'
                    }
                >
                    <Italic className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleUnderline().run();
                    }}
                    className={
                        editor.isActive('underline')
                            ? 'bg-primary text-white p-2 rounded-lg'
                            : 'text-primary'
                    }
                >
                    <Underline className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleStrike().run();
                    }}
                    className={
                        editor.isActive('strike')
                            ? 'bg-primary text-white p-2 rounded-lg'
                            : 'text-primary'
                    }
                >
                    <Strikethrough className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleBulletList().run();
                    }}
                    className={
                        editor.isActive('bulletList')
                            ? 'bg-primary text-white p-2 rounded-lg'
                            : 'text-primary'
                    }
                >
                    <List className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleOrderedList().run();
                    }}
                    className={
                        editor.isActive('orderedList')
                            ? 'bg-primary text-white p-2 rounded-lg'
                            : 'text-primary'
                    }
                >
                    <ListOrdered className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleBlockquote().run();
                    }}
                    className={
                        editor.isActive('blockquote')
                            ? 'bg-primary text-white p-2 rounded-lg'
                            : 'text-primary'
                    }
                >
                    <Quote className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().undo().run();
                    }}
                    className={
                        editor.isActive('undo')
                            ? 'bg-primary text-white p-2 rounded-lg'
                            : 'text-primary'
                    }
                >
                    <Undo className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().redo().run();
                    }}
                    className={
                        editor.isActive('redo')
                            ? 'bg-primary text-white p-2 rounded-lg'
                            : 'text-primary'
                    }
                >
                    <Redo className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}; 