enum PropertyType {
  apartment,
  condominium,
  villa,
  studio,
  compoundHouse,
  office,
  commercialBuilding,
  warehouse,
  shop;

  String get apiValue {
    switch (this) {
      case PropertyType.compoundHouse:
        return 'compound_house';
      case PropertyType.commercialBuilding:
        return 'commercial_building';
      default:
        return name;
    }
  }

  static PropertyType fromApi(String value) {
    switch (value) {
      case 'compound_house':
        return PropertyType.compoundHouse;
      case 'commercial_building':
        return PropertyType.commercialBuilding;
      default:
        return PropertyType.values.firstWhere(
          (e) => e.name == value.replaceAll('_', ''),
          orElse: () => PropertyType.apartment,
        );
    }
  }

  String get displayName {
    switch (this) {
      case PropertyType.apartment:
        return 'Apartment';
      case PropertyType.condominium:
        return 'Condominium';
      case PropertyType.villa:
        return 'Villa';
      case PropertyType.studio:
        return 'Studio';
      case PropertyType.compoundHouse:
        return 'Compound House';
      case PropertyType.office:
        return 'Office';
      case PropertyType.commercialBuilding:
        return 'Commercial Building';
      case PropertyType.warehouse:
        return 'Warehouse';
      case PropertyType.shop:
        return 'Shop';
    }
  }
}
