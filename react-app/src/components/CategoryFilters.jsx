const categories = [
  { id: "all", label: "All Media" },
  { id: "music", label: "Songs" },
  { id: "podcast", label: "Podcasts" },
  { id: "audiobook", label: "Audiobooks" },
  { id: "musicVideo", label: "Music Videos" },
];

function CategoryFilters({ activeCategory, onCategoryChange }) {
  return (
    <section
      className="categories-section"
      aria-label="Media categories"
    >
      <div className="category-filters">
        {categories.map((category) => (
          <button
            key={category.id}
            className={
              "category-btn" +
              (activeCategory === category.id ? " active" : "")
            }
            type="button"
            aria-pressed={activeCategory === category.id}
            onClick={() => onCategoryChange(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export default CategoryFilters;