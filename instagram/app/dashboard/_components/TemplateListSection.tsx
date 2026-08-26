'use client'
import React from 'react'
import Link from 'next/link'
import Templates from '@/app/(data)/Templates'

export interface TEMPLATE {
  name: string;
  desc: string;
  category: string;
  icon: string;
  aiPrompt: string;
  slug: string;
  form?: {
    label: string;
    field: string;
    name: string;
    required?: boolean;
  }[];
}

function TemplateListSection({ userSearchInput }: { userSearchInput?: string }) {
  const filtered = userSearchInput
    ? Templates.filter((t: TEMPLATE) =>
        t.name.toLowerCase().includes(userSearchInput.toLowerCase()) ||
        t.category.toLowerCase().includes(userSearchInput.toLowerCase())
      )
    : Templates;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 p-5">
      {filtered.map((template: TEMPLATE, index: number) => (
        <Link href={`/dashboard/content/${template.slug}`} key={index}>
          <div className="p-5 rounded-lg border bg-white shadow-sm hover:shadow-md transition cursor-pointer h-full">
            <img src={template.icon} alt={template.name} width={50} height={50} className="mb-3" />
            <h2 className="font-bold text-lg">{template.name}</h2>
            <p className="text-gray-500 text-sm mt-1">{template.desc}</p>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded mt-2 inline-block">{template.category}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default TemplateListSection
