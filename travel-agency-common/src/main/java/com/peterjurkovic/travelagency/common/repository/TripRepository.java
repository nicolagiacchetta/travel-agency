package com.peterjurkovic.travelagency.common.repository;

import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.stereotype.Repository;

import com.peterjurkovic.travelagency.common.model.Trip;

@Repository
public interface TripRepository extends PagingAndSortingRepository<Trip, String>  {

}
