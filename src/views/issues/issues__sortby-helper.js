/* @flow */

import {getApi} from '../../components/api/api__instance';

import {getCustomFieldName} from '../../components/custom-field/custom-field-helper';

import type API from '../../components/api/api';
import type {Folder} from '../../flow/User';
import type {IssueFieldSortProperty, SearchSuggestions} from '../../flow/Sorting';


const doAssist = async (params: {
  context: ?Folder,
  query: string,
  sortProperties?: Array<IssueFieldSortProperty>,
}): Promise<SearchSuggestions> => {
  const api: API = getApi();
  const {context, query = '', sortProperties} = params;
  return await api.search.getSearchSuggestions({
    folder: context?.id ? context : undefined,
    query,
    sortProperties,
  });
};

const getSortPropertyName = (sortProperty: IssueFieldSortProperty): string => {
  const name = (
    sortProperty
      ? (
        sortProperty?.sortField?.sortablePresentation ||
        sortProperty.localizedName ||
        getCustomFieldName((sortProperty.sortField: any))
      )
      : sortProperty
  );

  return (
    name && sortProperty?.sortField?.$type === 'PredefinedFilterField'
      ? name.charAt(0).toUpperCase() + name.slice(1)
      : name
  );
};

const isRelevanceSortProperty = (sortProperty: IssueFieldSortProperty): boolean => {
  return sortProperty.$type === 'RelevanceSortProperty';
};


export {
  doAssist,
  getSortPropertyName,
  isRelevanceSortProperty,
};