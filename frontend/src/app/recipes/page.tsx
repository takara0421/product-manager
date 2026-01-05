"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { API_URL } from "@/lib/config";

type Recipe = {
    id: number;
    name: string;
    total_cost: number;
};

export default function RecipesPage() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);

    useEffect(() => {
        fetchRecipes();
    }, []);

    const fetchRecipes = async () => {
        try {
            const response = await axios.get(`${API_URL}/recipes/`);
            setRecipes(response.data);
        } catch (error) {
            console.error("Error fetching recipes:", error);
        }
    };

    return (
        <div className="container min-h-screen pb-24">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>&larr; 戻る</Link>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>レシピ一覧</h1>
                <div style={{ width: '2rem' }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recipes.map((recipe) => (
                    <div key={recipe.id} className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{recipe.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                総原価
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '1.25rem' }}>
                                ¥{recipe.total_cost.toFixed(0)}
                            </div>
                            <Link
                                href={`#`}
                                style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'underline' }}
                            >
                                詳細 &rarr;
                            </Link>
                        </div>
                    </div>
                ))}
                {recipes.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        まだレシピがありません。<br />下のボタンから作成してください。
                    </div>
                )}
            </div>

            <Link
                href="/recipes/create"
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-color)',
                    color: 'white',
                    boxShadow: 'var(--shadow-lg)',
                    fontSize: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                }}
            >
                +
            </Link>
        </div>
    );
}
