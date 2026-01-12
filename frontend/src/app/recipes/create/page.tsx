"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { API_URL } from "@/lib/config";

type Ingredient = {
    id: number;
    name: string;
    price: number;
    amount: number;
    unit: string;
};

type RecipeItemInput = {
    ingredient_id: number;
    amount: number;
    section: "dough" | "filling";
    name?: string;
    unit?: string;
    unitCost?: number;
};

export default function CreateRecipePage() {
    const router = useRouter();
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [recipeName, setRecipeName] = useState("");
    const [sellingPrice, setSellingPrice] = useState("");
    const [items, setItems] = useState<RecipeItemInput[]>([]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [targetSection, setTargetSection] = useState<"dough" | "filling">("dough");
    const [selectedIngId, setSelectedIngId] = useState<string>("");
    const [amount, setAmount] = useState("");

    useEffect(() => {
        axios.get(`${API_URL}/ingredients/`).then((res) => setIngredients(res.data));
    }, []);

    const openAddModal = (section: "dough" | "filling") => {
        setTargetSection(section);
        setSelectedIngId("");
        setAmount("");
        setIsModalOpen(true);
    };

    const handleAddItem = () => {
        if (!selectedIngId || !amount) return;

        const ing = ingredients.find((i) => i.id === parseInt(selectedIngId));
        if (!ing) return;

        const newItem: RecipeItemInput = {
            ingredient_id: ing.id,
            amount: parseFloat(amount),
            section: targetSection,
            name: ing.name,
            unit: ing.unit,
            unitCost: ing.price / ing.amount,
        };

        setItems([...items, newItem]);
        setIsModalOpen(false);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.unitCost! * item.amount), 0);
    };

    const calculateSectionTotal = (section: "dough" | "filling") => {
        return items
            .filter(i => i.section === section)
            .reduce((sum, item) => sum + (item.unitCost! * item.amount), 0);
    };

    const handleSubmit = async () => {
        if (!recipeName || items.length === 0) return;
        try {
            await axios.post(`${API_URL}/recipes/`, {
                name: recipeName,
                selling_price: parseFloat(sellingPrice || "0"),
                items: items.map(i => ({
                    ingredient_id: i.ingredient_id,
                    amount: i.amount,
                    section: i.section
                }))
            });
            router.push("/recipes");
        } catch (error) {
            console.error("Failed to save recipe", error);
        }
    };

    const getSelectedIngDetails = () => {
        return ingredients.find(i => i.id.toString() === selectedIngId);
    };

    // Helper to render a list section
    const renderSection = (section: "dough" | "filling", title: string) => (
        <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                    {title}
                </h2>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    小計: ¥{calculateSectionTotal(section).toFixed(0)}
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {items.filter(i => i.section === section).map((item, idx) => {
                    // Find original index to remove correctly
                    const originalIndex = items.indexOf(item);
                    return (
                        <div key={idx} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: '600' }}>{item.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {item.amount}{item.unit}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ fontWeight: 'bold' }}>
                                    ¥{(item.unitCost! * item.amount).toFixed(1)}
                                </div>
                                <button
                                    onClick={() => handleRemoveItem(originalIndex)}
                                    style={{ color: 'var(--danger-color)', border: 'none', background: 'none', fontSize: '1.2rem' }}
                                >
                                    &times;
                                </button>
                            </div>
                        </div>
                    );
                })}

                <button
                    onClick={() => openAddModal(section)}
                    className="card"
                    style={{
                        border: '2px dashed #E5E7EB',
                        boxShadow: 'none',
                        color: 'var(--accent-color)',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        background: 'transparent',
                        padding: '0.75rem'
                    }}
                >
                    + {title}を追加
                </button>
            </div>
        </div>
    );

    return (
        <div className="container min-h-screen pb-32">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <Link href="/recipes" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>キャンセル</Link>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>新規レシピ作成</h1>
                <button
                    onClick={handleSubmit}
                    disabled={!recipeName || items.length === 0}
                    style={{
                        color: (!recipeName || items.length === 0) ? '#ccc' : 'var(--accent-color)',
                        fontWeight: 'bold',
                        border: 'none',
                        background: 'none',
                        fontSize: '1rem'
                    }}
                >
                    保存
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    className="input-field"
                    style={{ fontSize: '1.2rem', fontWeight: 'bold', border: 'none', borderBottom: '1px solid #eee', borderRadius: 0, paddingLeft: 0 }}
                    placeholder="レシピ名を入力"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>販売予定価格:</label>
                    <input
                        type="number"
                        className="input-field"
                        style={{ border: 'none', borderBottom: '1px solid #eee', borderRadius: 0, paddingLeft: 0, width: '100px' }}
                        placeholder="0"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                    />
                    <span style={{ fontSize: '0.9rem' }}>円</span>
                </div>
            </div>

            {renderSection("dough", "生地 (Dough)")}
            {renderSection("filling", "フィリング (Filling)")}

            {/* Bottom Sticky Cost Summary */}
            <div style={{
                position: 'fixed',
                bottom: 0, left: 0, right: 0,
                backgroundColor: 'white',
                borderTop: '1px solid #eee',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)',
                zIndex: 10
            }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    合計 ({items.length}点)
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        原価率: {(sellingPrice && parseFloat(sellingPrice) > 0) ? ((calculateTotal() / parseFloat(sellingPrice)) * 100).toFixed(1) : '---'}%
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                        ¥{calculateTotal().toFixed(0)}
                    </div>
                </div>
            </div>

            {/* Ingredient Selection Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'flex-end'
                }} onClick={() => setIsModalOpen(false)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            backgroundColor: 'white',
                            width: '100%',
                            height: '80vh',
                            borderTopLeftRadius: '1.5rem',
                            borderTopRightRadius: '1.5rem',
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            animation: 'slideUp 0.3s ease-out'
                        }}
                    >
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                            {targetSection === "dough" ? "生地" : "フィリング"}の材料を選択
                        </h2>

                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                            {ingredients.map(ing => (
                                <div
                                    key={ing.id}
                                    onClick={() => setSelectedIngId(ing.id.toString())}
                                    style={{
                                        padding: '1rem',
                                        borderBottom: '1px solid #f3f4f6',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        backgroundColor: selectedIngId === ing.id.toString() ? '#EEF2FF' : 'transparent',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span style={{ fontWeight: '500' }}>{ing.name}</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>¥{ing.price}/{ing.amount}{ing.unit}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>使用量</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                                <button
                                    onClick={handleAddItem}
                                    className="btn btn-primary"
                                    disabled={!selectedIngId || !amount}
                                    style={{ whiteSpace: 'nowrap', opacity: (!selectedIngId || !amount) ? 0.5 : 1 }}
                                >
                                    追加
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
