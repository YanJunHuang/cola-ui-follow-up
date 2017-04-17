package com.colaui.system.service;

import com.colaui.example.model.ColaDept;
import com.colaui.provider.Page;

import java.util.List;
import java.util.Map;

public interface ColaDeptService {
    Page<ColaDept> getPage(int pageSize,int pageNo,String contain);
    void save(ColaDept dept);
    void delete(String id);
    void update(ColaDept dept);
    ColaDept find(String id);
    List<ColaDept> find(int from,int limit);

    List<ColaDept> getDepts(Map<String, Object> params);

    Page<ColaDept> groupDepts(int pageSize, int pageNo, String groupId);
}