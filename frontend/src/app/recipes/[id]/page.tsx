"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { API_URL } from "@/lib/config";

// Types
type Ingredient = {
    id: number;
    name: string;
    price: number;
    amount: number;
    unit: string;
};

type RecipeItem = {
    id: number;
    ingredient: Ingredient;
    amount: number;
    section: string;
    cost: number;
};

type Recipe = {
    id: number;
    name: string;
    description: string;
    total_cost: number;
    selling_price: number;
    updated_at: string;
    items: RecipeItem[];
};

type RecipeHistory = {
    id: number;
    recipe_id: number;
    name: string;
    selling_price: number;
    updated_at: string;
    total_cost: number;
    changed_at: string;
};

export default function RecipeDetailPage() {
    const params = useParams();
    const recipeId = params.id;
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [history, setHistory] = useState<RecipeHistory[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecipe = async () => {
            try {
                const res = await axios.get(`${API_URL}/recipes/${recipeId}`);
                setRecipe(res.data);

                // Fetch history
                const histRes = await axios.get(`${API_URL}/recipes/${recipeId}/history`);
                setHistory(histRes.data);

                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch recipe", error);
                setLoading(false);
            }
        };
        if (recipeId) fetchRecipe();
    }, [recipeId]);

    if (loading) return <div className="p-4">Loading...</div>;
    if (!recipe) return <div className="p-4">Recipe not found</div>;

    const sections = ["dough", "filling"];

    return (
        <div className="container min-h-screen pb-24">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <Link href="/recipes" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>&larr; 一覧に戻る</Link>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        style={{ color: 'var(--accent-color)', background: 'none', border: 'none', fontSize: '0.9rem', textDecoration: 'underline' }}
                    >
                        {showHistory ? '詳細に戻る' : '変更履歴'}
                    </button>
                    <Link
                        href={`/recipes/${recipeId}/edit`}
                        style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}
                    >
                        編集
                    </Link>
                </div>
            </div>

            {showHistory ? (
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>変更履歴</h2>
                    {history.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>履歴はありません。</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {history.map(h => (
                                <div key={h.id} className="card" style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 'bold' }}>{h.changed_at.replace('T', ' ').substring(0, 16)}</span>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>更新日: {h.updated_at || '---'}</span>
                                    </div>
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <div style={{ fontWeight: 'bold' }}>{h.name}</div>
                                        <div>販売価格: ¥{h.selling_price?.toLocaleString() || '---'}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', borderTop: '1px solid #f3f4f6', paddingTop: '0.5rem' }}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>原価</div>
                                        <div style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '1.1rem' }}>¥{h.total_cost.toFixed(0)}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            原価率: {h.selling_price > 0 ? ((h.total_cost / h.selling_price) * 100).toFixed(1) : '---'}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{recipe.name}</h1>
                        <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            <div>
                                販売価格: <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>¥{recipe.selling_price?.toLocaleString() || '---'}</span>
                            </div>
                            <div>
                                更新日: {recipe.updated_at || '---'}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        {sections.map(section => {
                            const sectionItems = recipe.items.filter(i => i.section === section);
                            if (sectionItems.length === 0) return null;

                            const sectionCost = sectionItems.reduce((sum, item) => sum + item.cost, 0);

                            return (
                                <div key={section} style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.25rem' }}>
                                        <h3 style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                                            {section === 'dough' ? '生地' : 'フィリング'}
                                        </h3>
                                        <span style={{ fontWeight: 'bold' }}>¥{sectionCost.toFixed(0)}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {sectionItems.map(item => (
                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                <span>{item.ingredient.name} {item.amount}{item.ingredient.unit}</span>
                                                <span style={{ color: 'var(--text-secondary)' }}>¥{item.cost.toFixed(1)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{
                        backgroundColor: '#FEF3C7',
                        padding: '1.5rem',
                        borderRadius: '1rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.9rem', color: '#92400E', marginBottom: '0.5rem' }}>総原価</div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#B45309', lineHeight: 1 }}>
                            ¥{recipe.total_cost.toFixed(0)}
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#92400E' }}>
                            原価率: {recipe.selling_price > 0 ? ((recipe.total_cost / recipe.selling_price) * 100).toFixed(1) : '---'}%
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
