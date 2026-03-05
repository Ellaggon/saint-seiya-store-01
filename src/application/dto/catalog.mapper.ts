import type { Product } from "../../domain/entities/Product";
import type { Category } from "../../domain/entities/Category";
import type { Character } from "../../domain/entities/Character";
import type { ProductDTO, CategoryDTO, CharacterDTO } from "./catalog.dto";

export class CatalogMapper {
  static productToDTO(product: Product): ProductDTO {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      height: product.height,
      material: product.material,
      imageUrl: product.imageUrl,
      stock: product.stock,
      status: product.status,
    };
  }

  static categoryToDTO(category: Category): CategoryDTO {
    return {
      id: category.id,
      name: category.name,
    };
  }

  static characterToDTO(character: Character): CharacterDTO {
    return {
      id: character.id,
      name: character.name,
    };
  }

  static productListToDTO(products: Product[]): ProductDTO[] {
    return products.map((p) => this.productToDTO(p));
  }

  static categoryListToDTO(categories: Category[]): CategoryDTO[] {
    return categories.map((c) => this.categoryToDTO(c));
  }

  static characterListToDTO(characters: Character[]): CharacterDTO[] {
    return characters.map((c) => this.characterToDTO(c));
  }
}
