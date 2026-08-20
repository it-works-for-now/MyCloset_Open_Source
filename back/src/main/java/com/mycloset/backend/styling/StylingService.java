package com.mycloset.backend.styling;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mycloset.backend.clothes.Clothes;
import com.mycloset.backend.clothes.ClothesRepository;
import com.mycloset.backend.clothes.dto.ClothesResponse;
import com.mycloset.backend.common.ApiException;
import com.mycloset.backend.styling.dto.StylingItemRequest;
import com.mycloset.backend.styling.dto.StylingResponse;
import com.mycloset.backend.styling.dto.StylingSaveRequest;
import com.mycloset.backend.user.UserAccount;
import com.mycloset.backend.user.UserRepository;

@Service
public class StylingService {

    private final StylingRepository stylingRepository;
    private final StylingItemRepository stylingItemRepository;
    private final ClothesRepository clothesRepository;
    private final UserRepository userRepository;

    public StylingService(
            StylingRepository stylingRepository,
            StylingItemRepository stylingItemRepository,
            ClothesRepository clothesRepository,
            UserRepository userRepository) {
        this.stylingRepository = stylingRepository;
        this.stylingItemRepository = stylingItemRepository;
        this.clothesRepository = clothesRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<StylingResponse> findMyStylings(String loginId) {
        UserAccount user = findUser(loginId);
        List<Styling> stylings = stylingRepository.findAllByUser_UserIdxOrderByUpdatedAtDesc(user.getUserIdx());
        if (stylings.isEmpty()) {
            return List.of();
        }

        Map<Long, List<StylingItem>> itemsByStylingId = findItemsByStylingId(stylings);
        Map<Long, Clothes> clothesById = findMyClothes(itemsByStylingId.values(), user.getUserIdx());
        return stylings.stream()
                .map(styling -> toResponse(
                        styling, itemsByStylingId.getOrDefault(styling.getStylingIdx(), List.of()), clothesById))
                .toList();
    }

    @Transactional(readOnly = true)
    public StylingResponse findMyStyling(String loginId, Long stylingId) {
        UserAccount user = findUser(loginId);
        Styling styling = findMyStyling(stylingId, user.getUserIdx());
        List<StylingItem> items = stylingItemRepository.findAllByIdStylingIdx(stylingId);
        return toResponse(styling, items, findMyClothes(List.of(items), user.getUserIdx()));
    }

    @Transactional
    public StylingResponse create(String loginId, StylingSaveRequest request) {
        UserAccount user = findUser(loginId);
        Map<String, Clothes> selectedClothes = resolveSelectedClothes(user.getUserIdx(), request.items());
        Styling styling =
                stylingRepository.save(new Styling(user, request.name().trim(), trimToNull(request.memo())));
        List<StylingItem> items = toStylingItems(styling.getStylingIdx(), user.getUserIdx(), selectedClothes);
        stylingItemRepository.saveAll(items);
        return toResponse(styling, items, toClothesById(selectedClothes.values()));
    }

    @Transactional
    public StylingResponse update(String loginId, Long stylingId, StylingSaveRequest request) {
        UserAccount user = findUser(loginId);
        Styling styling = findMyStyling(stylingId, user.getUserIdx());
        Map<String, Clothes> selectedClothes = resolveSelectedClothes(user.getUserIdx(), request.items());

        styling.update(request.name().trim(), trimToNull(request.memo()));
        stylingItemRepository.deleteAllByStylingIdx(stylingId);
        stylingItemRepository.flush();

        List<StylingItem> items = toStylingItems(stylingId, user.getUserIdx(), selectedClothes);
        stylingItemRepository.saveAll(items);
        return toResponse(styling, items, toClothesById(selectedClothes.values()));
    }

    @Transactional
    public void delete(String loginId, Long stylingId) {
        UserAccount user = findUser(loginId);
        stylingRepository.delete(findMyStyling(stylingId, user.getUserIdx()));
    }

    private UserAccount findUser(String loginId) {
        return userRepository
                .findByLoginId(loginId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "\uc0ac\uc6a9\uc790\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4."));
    }

    private Styling findMyStyling(Long stylingId, Long userIdx) {
        return stylingRepository
                .findByStylingIdxAndUser_UserIdx(stylingId, userIdx)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "\ucf54\ub514 \uc815\ubcf4\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4."));
    }

    private Map<String, Clothes> resolveSelectedClothes(Long userIdx, Map<String, StylingItemRequest> requestedItems) {
        Map<String, Long> clothesIdBySlot = new LinkedHashMap<>();
        Set<Long> clothesIds = new LinkedHashSet<>();

        for (Map.Entry<String, StylingItemRequest> entry : requestedItems.entrySet()) {
            StylingSlot slot = StylingSlot.fromKey(entry.getKey());
            if (slot == null) {
                throw badRequest(
                        "\ucf54\ub514 \uc2ac\ub86f \ud0a4\uac00 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.");
            }
            StylingItemRequest item = entry.getValue();
            Long clothesId = item == null ? null : item.resolvedClothesId();
            if (clothesId == null) {
                throw badRequest("\ucf54\ub514\uc5d0 \ub123\uc744 \uc637\uc744 \uc120\ud0dd\ud574\uc8fc\uc138\uc694.");
            }
            if (!clothesIds.add(clothesId)) {
                throw badRequest(
                        "\ud558\ub098\uc758 \uc637\uc740 \ud55c \ucf54\ub514\uc5d0 \ud55c \ubc88\ub9cc \ub123\uc744 \uc218 \uc788\uc2b5\ub2c8\ub2e4.");
            }
            clothesIdBySlot.put(slot.getKey(), clothesId);
        }

        if (clothesIdBySlot.isEmpty()) {
            return Map.of();
        }

        Map<Long, Clothes> clothesById =
                toClothesById(clothesRepository.findAllByClothesIdxInAndUser_UserIdx(clothesIds, userIdx));
        if (clothesById.size() != clothesIds.size()) {
            throw badRequest(
                    "\ub0b4 \uc637\uc7a5\uc5d0 \uc5c6\ub294 \uc637\uc740 \ucf54\ub514\uc5d0 \ub123\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.");
        }

        Map<String, Clothes> selectedClothes = new LinkedHashMap<>();
        for (Map.Entry<String, Long> entry : clothesIdBySlot.entrySet()) {
            StylingSlot slot = StylingSlot.fromKey(entry.getKey());
            Clothes clothes = clothesById.get(entry.getValue());
            if (!slot.supportsCategory(clothes.getCategory())) {
                throw badRequest(
                        "\uc120\ud0dd\ud55c \uc637\uc758 \uce74\ud14c\uace0\ub9ac\uac00 \ucf54\ub514 \uc2ac\ub86f\uacfc \ub9de\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.");
            }
            selectedClothes.put(entry.getKey(), clothes);
        }
        return selectedClothes;
    }

    private List<StylingItem> toStylingItems(Long stylingId, Long userIdx, Map<String, Clothes> selectedClothes) {
        return selectedClothes.entrySet().stream()
                .map(entry -> new StylingItem(
                        stylingId, entry.getKey(), entry.getValue().getClothesIdx(), userIdx))
                .toList();
    }

    private Map<Long, List<StylingItem>> findItemsByStylingId(List<Styling> stylings) {
        List<Long> stylingIds = stylings.stream().map(Styling::getStylingIdx).toList();
        return stylingItemRepository.findAllByIdStylingIdxIn(stylingIds).stream()
                .collect(Collectors.groupingBy(
                        item -> item.getId().getStylingIdx(), LinkedHashMap::new, Collectors.toList()));
    }

    private Map<Long, Clothes> findMyClothes(Collection<List<StylingItem>> itemGroups, Long userIdx) {
        Set<Long> clothesIds = itemGroups.stream()
                .flatMap(Collection::stream)
                .map(StylingItem::getClothesIdx)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (clothesIds.isEmpty()) {
            return Map.of();
        }
        return toClothesById(clothesRepository.findAllByClothesIdxInAndUser_UserIdx(clothesIds, userIdx));
    }

    private Map<Long, Clothes> toClothesById(Collection<Clothes> clothes) {
        return clothes.stream()
                .collect(Collectors.toMap(
                        Clothes::getClothesIdx, Function.identity(), (first, ignored) -> first, LinkedHashMap::new));
    }

    private StylingResponse toResponse(Styling styling, List<StylingItem> items, Map<Long, Clothes> clothesById) {
        Map<String, Clothes> clothesBySlot = new LinkedHashMap<>();
        for (StylingItem item : items) {
            Clothes clothes = clothesById.get(item.getClothesIdx());
            if (clothes != null) {
                clothesBySlot.put(item.getId().getSlotKey(), clothes);
            }
        }

        Map<String, ClothesResponse> responseItems = new LinkedHashMap<>();
        for (StylingSlot slot : StylingSlot.values()) {
            Clothes clothes = clothesBySlot.get(slot.getKey());
            if (clothes != null) {
                responseItems.put(slot.getKey(), ClothesResponse.from(clothes));
            }
        }

        return new StylingResponse(
                styling.getStylingIdx(),
                styling.getStylingIdx(),
                styling.getName(),
                styling.getMemo(),
                responseItems,
                styling.getCreatedAt(),
                styling.getUpdatedAt());
    }

    private ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
